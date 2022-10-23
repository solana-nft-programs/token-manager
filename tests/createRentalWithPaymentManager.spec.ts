import { getPaymentManager } from "@cardinal/payment-manager/dist/cjs/accounts";
import { init } from "@cardinal/payment-manager/dist/cjs/instruction";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { BN, web3 } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

import { findAta, rentals, tryGetAccount } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import { getClaimApprover } from "../src/programs/claimApprover/accounts";
import { TokenManagerState } from "../src/programs/tokenManager";
import { createMint } from "./utils";
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
  let paymentMint: Token;
  let rentalMint: Token;
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
    [recipientPaymentTokenAccountId, paymentMint] = await createMint(
      provider.connection,
      user,
      recipient.publicKey,
      RECIPIENT_START_PAYMENT_AMOUNT
    );

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      user,
      user.publicKey,
      1,
      user.publicKey
    );
  });

  it("Create payment manager", async () => {
    const provider = getProvider();
    const transaction = new web3.Transaction();

    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const ix = init(
      provider.connection,
      new SignerWallet(user),
      paymentManagerName,
      {
        paymentManagerId: paymentManagerId,
        feeCollector: feeCollector.publicKey,
        makerFeeBasisPoints: MAKER_FEE,
        takerFeeBasisPoints: TAKER_FEE,
        includeSellerFeeBasisPoints: false,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
      }
    );

    transaction.add(ix);
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "Create Payment Manager", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

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
      new SignerWallet(user),
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
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "Create Rental", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(user.publicKey);

    const claimApproverData = await getClaimApprover(
      provider.connection,
      tokenManagerData.pubkey
    );
    expect(claimApproverData.parsed.paymentManager.toString()).to.eq(
      paymentManagerId.toString()
    );

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

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
      new SignerWallet(recipient),
      tokenManagerId
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );

    await expectTXTable(txEnvelope, "Claim Rental", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await rentalMint.getAccountInfo(
      await findAta(rentalMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);

    const checkRecipientPaymentTokenAccount = await paymentMint.getAccountInfo(
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toNumber()).to.eq(
      RECIPIENT_START_PAYMENT_AMOUNT -
        RENTAL_PAYMENT_AMONT -
        Math.floor((RENTAL_PAYMENT_AMONT * TAKER_FEE) / BASIS_POINTS_DIVISOR)
    );

    const feeCollectorTokenAccountAfter = await paymentMint.getAccountInfo(
      await findAta(paymentMint.publicKey, feeCollector.publicKey)
    );

    expect(feeCollectorTokenAccountAfter.amount.toNumber()).to.eq(
      Math.floor(
        new BN(RENTAL_PAYMENT_AMONT)
          .mul(new BN(MAKER_FEE).add(new BN(TAKER_FEE)))
          .div(new BN(BASIS_POINTS_DIVISOR))
          .toNumber()
      )
    );
  });

  it("Extend Rental", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );

    const recipientPaymentTokenAccountBefore = await paymentMint.getAccountInfo(
      recipientPaymentTokenAccountId
    );

    const feeCollectorTokenAccountBefore = await paymentMint.getAccountInfo(
      await findAta(paymentMint.publicKey, feeCollector.publicKey)
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
      new SignerWallet(recipient),
      tokenManagerId,
      1000 * 10 // 10 amount extension
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );

    await expectTXTable(txEnvelope, "Extend Rental", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

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

    const checkRecipientTokenAccount = await rentalMint.getAccountInfo(
      await findAta(rentalMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);

    const checkRecipientPaymentTokenAccount = await paymentMint.getAccountInfo(
      recipientPaymentTokenAccountId
    );

    expect(checkRecipientPaymentTokenAccount.amount.toNumber()).to.eq(
      recipientPaymentTokenAccountBefore.amount
        .sub(new BN(10))
        .sub(
          new BN(10).mul(new BN(TAKER_FEE)).div(new BN(BASIS_POINTS_DIVISOR))
        )
        .toNumber()
    );

    const feeCollectorTokenAccountAfter = await paymentMint.getAccountInfo(
      await findAta(paymentMint.publicKey, feeCollector.publicKey)
    );

    expect(feeCollectorTokenAccountAfter.amount.toNumber()).to.eq(
      feeCollectorTokenAccountBefore.amount
        .add(
          new BN(10)
            .mul(new BN(TAKER_FEE).add(new BN(MAKER_FEE)))
            .div(new BN(BASIS_POINTS_DIVISOR))
        )
        .toNumber()
    );
  });
});
