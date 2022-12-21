import {
  createMintIxs,
  executeTransaction,
  findAta,
  tryGetAccount,
} from "@cardinal/common";
import { DEFAULT_BUY_SIDE_FEE_SHARE } from "@cardinal/payment-manager";
import { getPaymentManager } from "@cardinal/payment-manager/dist/cjs/accounts";
import { init } from "@cardinal/payment-manager/dist/cjs/instruction";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { BN, Wallet, web3 } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { rentals } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import { getClaimApprover } from "../src/programs/claimApprover/accounts";
import { TokenManagerState } from "../src/programs/tokenManager";
import { getProvider } from "./workspace";

describe("Create rental with payment manager and extend", () => {
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
  const paymentMint: Keypair = Keypair.generate();
  const rentalMint: Keypair = Keypair.generate();
  let expiration: number;
  let paymentManagerId: PublicKey;

  before(async () => {
    const provider = getProvider();
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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      paymentMint.publicKey,
      recipient.publicKey,
      { amount: RECIPIENT_START_PAYMENT_AMOUNT }
    );
    recipientPaymentTokenAccountId = await findAta(
      paymentMint.publicKey,
      recipient.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    // create rental mint
    const transaction2 = new Transaction();
    const [ixs2] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      user.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    transaction2.instructions = ixs2;
    await executeTransaction(
      provider.connection,
      transaction2,
      new Wallet(user)
    );
  });

  it("Create payment manager", async () => {
    const provider = getProvider();
    const transaction = new web3.Transaction();

    [paymentManagerId] = await findPaymentManagerAddress(paymentManagerName);
    const ix = init(provider.connection, new Wallet(user), paymentManagerName, {
      paymentManagerId: paymentManagerId,
      feeCollector: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE,
      takerFeeBasisPoints: TAKER_FEE,
      includeSellerFeeBasisPoints: false,
      royaltyFeeShare: new BN(0),
      authority: user.publicKey,
      payer: user.publicKey,
    });
    transaction.add(ix);
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const [checkPaymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const paymentManagerData = await getPaymentManager(
      provider.connection,
      checkPaymentManagerId
    );
    expect(paymentManagerData.parsed.name).to.eq(paymentManagerName);
  });

  it("Create rental", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint.publicKey,
          paymentManager: paymentManagerId,
        },
        timeInvalidation: {
          durationSeconds: 1000,
          maxExpiration: Date.now() / 1000 + 20000,
          extension: {
            extensionPaymentAmount: 1, // Pay 1 amount to add 1000 seconds of expiration time
            extensionDurationSeconds: 1000,
            extensionPaymentMint: paymentMint.publicKey,
            disablePartialExtension: true,
          },
        },
        mint: rentalMint.publicKey,
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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );

    const claimApproverData = await getClaimApprover(
      provider.connection,
      tokenManagerData.pubkey
    );
    expect(claimApproverData.parsed.paymentManager.toString()).to.eq(
      paymentManagerId.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      user.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).to.include(
      tokenManagerId.toString()
    );
  });

  it("Claim rental", async () => {
    const provider = getProvider();

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );

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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    const recipientAtaId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).to.eq(
      (
        RECIPIENT_START_PAYMENT_AMOUNT -
        RENTAL_PAYMENT_AMONT -
        Math.floor((RENTAL_PAYMENT_AMONT * TAKER_FEE) / BASIS_POINTS_DIVISOR)
      ).toString()
    );

    const feeCollectorAtaId = await findAta(
      paymentMint.publicKey,
      feeCollector.publicKey
    );
    const feeCollectorTokenAccountAfter = await getAccount(
      provider.connection,
      feeCollectorAtaId
    );

    const buySideFee =
      (RENTAL_PAYMENT_AMONT * DEFAULT_BUY_SIDE_FEE_SHARE) /
      BASIS_POINTS_DIVISOR;
    expect(feeCollectorTokenAccountAfter.amount.toString()).to.eq(
      Math.floor(
        new BN(RENTAL_PAYMENT_AMONT)
          .mul(new BN(MAKER_FEE).add(new BN(TAKER_FEE).add(new BN(buySideFee))))
          .div(new BN(BASIS_POINTS_DIVISOR))
          .toNumber()
      ).toString()
    );
  });

  it("Extend Rental", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );

    const recipientPaymentTokenAccountBefore = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );

    const feeCollectorAtaId = await findAta(
      paymentMint.publicKey,
      feeCollector.publicKey
    );
    const feeCollectorTokenAccountBefore = await getAccount(
      provider.connection,
      feeCollectorAtaId
    );

    let timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        (
          await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
        )[0]
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
        (
          await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
        )[0]
      )
    );

    expect(timeInvalidatorData?.parsed.expiration?.toNumber()).to.eq(
      expiration + 10000
    );

    const recipientAtaId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );

    expect(checkRecipientPaymentTokenAccount.amount.toString()).to.eq(
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

    expect(feeCollectorTokenAccountAfter.amount.toString()).to.eq(
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
