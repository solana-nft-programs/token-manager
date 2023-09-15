import { BN, Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
  tryGetAccount,
} from "@solana-nft-programs/common";
import { DEFAULT_BUY_SIDE_FEE_SHARE } from "@solana-nft-programs/payment-manager";
import { getPaymentManager } from "@solana-nft-programs/payment-manager/dist/cjs/accounts";
import { findPaymentManagerAddress } from "@solana-nft-programs/payment-manager/dist/cjs/pda";
import { withInit } from "@solana-nft-programs/payment-manager/dist/cjs/transaction";

import { rentals } from "../../../src";
import { timeInvalidator, tokenManager } from "../../../src/programs";
import { getClaimApprover } from "../../../src/programs/claimApprover/accounts";
import { TokenManagerState } from "../../../src/programs/tokenManager";

describe("Create rental with payment manager and extend", () => {
  let provider: SolanaProvider;
  const RECIPIENT_START_PAYMENT_AMOUNT = 100000;
  const RENTAL_PAYMENT_AMONT = 10000;
  const MAKER_FEE = 500;
  const TAKER_FEE = 300;
  const BASIS_POINTS_DIVISOR = 10000;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  const paymentManagerName = Math.random().toString(36).slice(2, 7);
  const feeCollector = Keypair.generate();
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  let paymentMint: PublicKey;
  let rentalMint: PublicKey;
  let expiration: number;
  let paymentManagerId: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);

    // create payment mint
    [recipientPaymentTokenAccountId, paymentMint] = await createMint(
      provider.connection,
      new Wallet(recipient),
      { amount: RECIPIENT_START_PAYMENT_AMOUNT }
    );

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(user)
    );
  });

  it("Create payment manager", async () => {
    provider = await getTestProvider();
    paymentManagerId = findPaymentManagerAddress(paymentManagerName);

    const pmtx = new Transaction();
    await withInit(pmtx, provider.connection, new Wallet(user), {
      paymentManagerName: paymentManagerName,
      feeCollectorId: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE,
      takerFeeBasisPoints: TAKER_FEE,
      includeSellerFeeBasisPoints: false,
      royaltyFeeShare: new BN(0),
      payer: user.publicKey,
    });
    await executeTransaction(provider.connection, pmtx, new Wallet(user));

    const checkPaymentManagerId = findPaymentManagerAddress(paymentManagerName);
    const paymentManagerData = await getPaymentManager(
      provider.connection,
      checkPaymentManagerId
    );
    expect(paymentManagerData.parsed.name).toEqual(paymentManagerName);
  });

  it("Create rental", async () => {
    provider = await getTestProvider();
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint,
          paymentManager: paymentManagerId,
        },
        timeInvalidation: {
          durationSeconds: 1000,
          maxExpiration: Date.now() / 1000 + 20000,
          extension: {
            extensionPaymentAmount: 1, // Pay 1 amount to add 1000 seconds of expiration time
            extensionDurationSeconds: 1000,
            extensionPaymentMint: paymentMint,
            disablePartialExtension: true,
          },
        },
        mint: rentalMint,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(
      rentalMint.toString()
    );
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      1
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      user.publicKey.toString()
    );

    const claimApproverData = await getClaimApprover(
      provider.connection,
      tokenManagerData.pubkey
    );
    expect(claimApproverData.parsed.paymentManager.toString()).toEqual(
      paymentManagerId.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      user.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).toContain(
      tokenManagerId.toString()
    );
  });

  it("Claim rental", async () => {
    provider = await getTestProvider();

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const transaction = await rentals.claimRental(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).toEqual(
      (
        RECIPIENT_START_PAYMENT_AMOUNT -
        RENTAL_PAYMENT_AMONT -
        Math.floor((RENTAL_PAYMENT_AMONT * TAKER_FEE) / BASIS_POINTS_DIVISOR)
      ).toString()
    );

    const feeCollectorAtaId = await findAta(
      paymentMint,
      feeCollector.publicKey
    );
    const feeCollectorTokenAccountAfter = await getAccount(
      provider.connection,
      feeCollectorAtaId
    );

    const buySideFee =
      (RENTAL_PAYMENT_AMONT * DEFAULT_BUY_SIDE_FEE_SHARE) /
      BASIS_POINTS_DIVISOR;
    expect(feeCollectorTokenAccountAfter.amount.toString()).toEqual(
      Math.floor(
        new BN(RENTAL_PAYMENT_AMONT)
          .mul(new BN(MAKER_FEE).add(new BN(TAKER_FEE).add(new BN(buySideFee))))
          .div(new BN(BASIS_POINTS_DIVISOR))
          .toNumber()
      ).toString()
    );
  });

  it("Extend Rental", async () => {
    provider = await getTestProvider();
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const recipientPaymentTokenAccountBefore = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );

    const feeCollectorAtaId = await findAta(
      paymentMint,
      feeCollector.publicKey
    );
    const feeCollectorTokenAccountBefore = await getAccount(
      provider.connection,
      feeCollectorAtaId
    );

    let timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );
    const tokenManagerData = await tryGetAccount(async () =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expiration =
      (timeInvalidatorData?.parsed.durationSeconds?.toNumber() || 0) +
      (tokenManagerData?.parsed.stateChangedAt.toNumber() || 0);

    const transaction = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      1000 * 10 // 10 amount extension
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );

    expect(timeInvalidatorData?.parsed.expiration?.toNumber()).toEqual(
      expiration + 10000
    );

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );

    expect(Number(checkRecipientPaymentTokenAccount.amount)).toEqual(
      Number(recipientPaymentTokenAccountBefore.amount) -
        10 -
        new BN(10)
          .mul(new BN(TAKER_FEE))
          .div(new BN(BASIS_POINTS_DIVISOR))
          .toNumber()
    );

    const feeCollectorTokenAccountAfter = await getAccount(
      provider.connection,
      feeCollectorAtaId
    );

    expect(feeCollectorTokenAccountAfter.amount.toString()).toEqual(
      (
        Number(feeCollectorTokenAccountBefore.amount) +
        new BN(10)
          .mul(new BN(TAKER_FEE).add(new BN(MAKER_FEE)))
          .div(new BN(BASIS_POINTS_DIVISOR))
          .toNumber()
      ).toString()
    );
  });
});
