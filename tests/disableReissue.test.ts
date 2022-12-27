import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
  tryGetAccount,
} from "@cardinal/common";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { invalidate, issueToken, rentals } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import {
  InvalidationType,
  tokenManagerProgram,
  TokenManagerState,
} from "../src/programs/tokenManager";

describe("Create rental reissue", () => {
  const recipient = Keypair.generate();
  const issuer = Keypair.generate();
  const durationSeconds = 1;
  const maxExpiration = Math.floor(Date.now() / 1000 + 5);
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();

  beforeAll(async () => {
    const provider = await getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      issuer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);

    // create rental mint
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      issuer.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      issuer.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(issuer)
    );
  });

  it("Create rental", async () => {
    const provider = await getProvider();
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(issuer),
      {
        timeInvalidation: {
          durationSeconds,
          maxExpiration,
        },
        invalidationType: InvalidationType.Reissue,
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(issuer)
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
      issuer.publicKey.toString()
    );

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.maxExpiration?.toNumber()).to.eq(
      maxExpiration
    );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).to.eq(
      durationSeconds
    );
  });

  it("Claim rental", async () => {
    const provider = await getProvider();

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const transaction = await rentals.claimRental(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );

    const tokenManagerAccountBefore = await provider.connection.getAccountInfo(
      tokenManagerId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerAccountAfter = await provider.connection.getAccountInfo(
      tokenManagerId
    );
    expect(
      (tokenManagerAccountAfter?.lamports || 0) -
        (tokenManagerAccountBefore?.lamports || 0)
    ).to.eq(5000000);

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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).to.eq(
      durationSeconds
    );
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const provider = await getProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const tokenManagerAccountBefore = await provider.connection.getAccountInfo(
      tokenManagerId
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerAccountAfter = await provider.connection.getAccountInfo(
      tokenManagerId
    );
    expect(
      (tokenManagerAccountBefore?.lamports || 0) -
        (tokenManagerAccountAfter?.lamports || 0)
    ).to.eq(5000000);

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
      issuer.publicKey.toString()
    );

    const recipientAtaId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("0");

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.maxExpiration?.toNumber()).to.eq(
      maxExpiration
    );
  });

  it("Claim again", async () => {
    const provider = await getProvider();

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).to.eq(
      durationSeconds
    );
  });

  it("Disable reissue", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const updateInvalidationTypeIx = await tmManagerProgram.methods
      .updateInvalidationType(InvalidationType.Return)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: issuer.publicKey,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(updateInvalidationTypeIx);

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(issuer)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.invalidationType).to.eq(
      InvalidationType.Return
    );
  });

  it("Enable reissue", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );
    const updateInvalidationTypeIx = await tmManagerProgram.methods
      .updateInvalidationType(InvalidationType.Reissue)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: issuer.publicKey,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(updateInvalidationTypeIx);
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(issuer)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.invalidationType).to.eq(
      InvalidationType.Reissue
    );
  });

  it("Disable reissue again", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );
    const updateInvalidationTypeIx = await tmManagerProgram.methods
      .updateInvalidationType(InvalidationType.Return)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: issuer.publicKey,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(updateInvalidationTypeIx);

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(issuer)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.invalidationType).to.eq(
      InvalidationType.Return
    );
  });

  it("Invalidate again", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const provider = await getProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );
    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).to.eq(null);

    const recipientAtaId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("0");

    const issuerAtaId = await findAta(rentalMint.publicKey, issuer.publicKey);
    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerAtaId
    );
    expect(Number(checkIssuerTokenAccount.amount)).to.greaterThan(0);
  });
});
