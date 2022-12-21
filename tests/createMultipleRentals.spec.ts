import { createMintIxs, executeTransaction, findAta } from "@cardinal/common";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { rentals } from "../src";
import { tokenManager } from "../src/programs";
import { TokenManagerState } from "../src/programs/tokenManager";
import { getTokenManagersByState } from "../src/programs/tokenManager/accounts";
import { getProvider } from "./workspace";

describe("Multiple rentals", () => {
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  const paymentMint: Keypair = Keypair.generate();
  const rentalMint: Keypair = Keypair.generate();

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

  it("Create rental", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint.publicKey,
        },
        timeInvalidation: { maxExpiration: Date.now() / 1000 + 1 },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
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

  it("Create another rental different mint", async () => {
    const provider = getProvider();
    const rentalMint2 = Keypair.generate();
    const transaction2 = new Transaction();
    const [ixs2] = await createMintIxs(
      provider.connection,
      rentalMint2.publicKey,
      user.publicKey
    );
    const issuerTokenAccountId2 = await findAta(
      rentalMint2.publicKey,
      user.publicKey,
      true
    );
    transaction2.instructions = ixs2;
    await executeTransaction(
      provider.connection,
      transaction2,
      new Wallet(user)
    );

    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint.publicKey,
        },
        timeInvalidation: { maxExpiration: Date.now() / 1000 + 1 },
        mint: rentalMint2.publicKey,
        issuerTokenAccountId: issuerTokenAccountId2,
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
      rentalMint2.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId2
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

    // check number of issued tokens
    const issuedTokens = await getTokenManagersByState(
      provider.connection,
      TokenManagerState.Issued
    );
    expect(
      issuedTokens.filter(
        (i) => i.parsed.issuer.toString() === user.publicKey.toString()
      ).length
    ).to.eq(2);
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

    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      await findAta(rentalMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).to.eq(
      (RECIPIENT_START_PAYMENT_AMOUNT - RENTAL_PAYMENT_AMONT).toString()
    );
  });
});
