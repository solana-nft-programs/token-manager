import { Wallet } from "@coral-xyz/anchor";
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

import { invalidate, issueToken, rentals } from "../../../src";
import { timeInvalidator, tokenManager } from "../../../src/programs";
import {
  InvalidationType,
  tokenManagerProgram,
  TokenManagerState,
} from "../../../src/programs/tokenManager";

describe("Create rental reissue", () => {
  let provider: SolanaProvider;
  const recipient = Keypair.generate();
  const issuer = Keypair.generate();
  const durationSeconds = 1;
  const maxExpiration = Math.floor(Date.now() / 1000 + 5);
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
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
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(issuer)
    );
  });

  it("Create rental", async () => {
    provider = await getTestProvider();
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(issuer),
      {
        timeInvalidation: {
          durationSeconds,
          maxExpiration,
        },
        invalidationType: InvalidationType.Reissue,
        mint: rentalMint,
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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(
      rentalMint.toString()
    );
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      1
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      issuer.publicKey.toString()
    );

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.maxExpiration?.toNumber()).toEqual(
      maxExpiration
    );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).toEqual(
      durationSeconds
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
    ).toEqual(5000000);

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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).toEqual(
      durationSeconds
    );
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    provider = await getTestProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(recipient),
      rentalMint
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

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
    ).toEqual(5000000);

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
      issuer.publicKey.toString()
    );

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("0");

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.maxExpiration?.toNumber()).toEqual(
      maxExpiration
    );
  });

  it("Claim again", async () => {
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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).toEqual(
      durationSeconds
    );
  });

  it("Disable reissue", async () => {
    provider = await getTestProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.invalidationType).toEqual(
      InvalidationType.Return
    );
  });

  it("Enable reissue", async () => {
    provider = await getTestProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.invalidationType).toEqual(
      InvalidationType.Reissue
    );
  });

  it("Disable reissue again", async () => {
    provider = await getTestProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.invalidationType).toEqual(
      InvalidationType.Return
    );
  });

  it("Invalidate again", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    provider = await getTestProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(recipient),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).toEqual(null);

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("0");

    const issuerAtaId = await findAta(rentalMint, issuer.publicKey);
    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerAtaId
    );
    expect(Number(checkIssuerTokenAccount.amount)).toBeGreaterThan(0);
  });
});
