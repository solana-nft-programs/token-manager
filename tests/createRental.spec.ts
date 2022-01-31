import { BN } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

import { claimRental, createRental, findAta } from "../src";
import { rentalCounter, tokenManager } from "../src/programs";
import { TokenManagerState } from "../src/programs/tokenManager";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Rentals", () => {
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  let paymentMint: Token;
  let rentalMint: Token;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
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
      tokenCreator,
      recipient.publicKey,
      RECIPIENT_START_PAYMENT_AMOUNT
    );

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1
    );
  });

  it("Create rental", async () => {
    const provider = getProvider();

    const [transaction, tokenManagerId] = await createRental(
      provider.connection,
      provider.wallet,
      {
        paymentAmount: RENTAL_PAYMENT_AMONT,
        paymentMint: paymentMint.publicKey,
        expiration: Date.now() / 1000 + 1,
        rentalMint: rentalMint.publicKey,
        issuerTokenAccountId,
        amount: new BN(1),
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRentalCounter = await rentalCounter.accounts.getRentalCounter(
      provider.connection,
      provider.wallet.publicKey
    );
    expect(checkRentalCounter.parsed.count.toNumber()).to.eq(1);
  });

  it("Create another rental", async () => {
    const provider = getProvider();

    const tokenCreator = Keypair.generate();
    const fromAirdropSignature = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(fromAirdropSignature);

    const [_, paymentMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1000
    );

    const [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1
    );

    const [transaction, tokenManagerId] = await createRental(
      provider.connection,
      provider.wallet,
      {
        paymentAmount: RENTAL_PAYMENT_AMONT,
        paymentMint: paymentMint.publicKey,
        expiration: Date.now() / 1000 + 1,
        rentalMint: rentalMint.publicKey,
        issuerTokenAccountId,
        amount: new BN(1),
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRentalCounter = await rentalCounter.accounts.getRentalCounter(
      provider.connection,
      provider.wallet.publicKey
    );
    expect(checkRentalCounter.parsed.count.toNumber()).to.eq(2);
  });

  it("Claim rental", async () => {
    const provider = getProvider();

    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
      provider.wallet.publicKey,
      new BN(1).toBuffer()
    );

    const transaction = await claimRental(
      provider.connection,
      provider.wallet,
      tokenManagerId
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test?", {
      verbosity: "always",
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

    const checkRecipientPaymentTokenAccount = await rentalMint.getAccountInfo(
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toNumber()).to.eq(
      RECIPIENT_START_PAYMENT_AMOUNT - RENTAL_PAYMENT_AMONT
    );
  });
});
