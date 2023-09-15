import { BN, Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
  withFindOrInitAssociatedTokenAccount,
} from "@solana-nft-programs/common";

import { claimToken, withTransfer } from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  tokenManagerProgram,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import {
  findMintCounterId,
  findMintManagerId,
  findTokenManagerAddress,
  findTransferReceiptId,
} from "../../src/programs/tokenManager/pda";

describe("Transfer receipt transfer", () => {
  let provider: SolanaProvider;
  const recipient = Keypair.generate();
  const target = Keypair.generate();
  const incorrectTarget = Keypair.generate();
  const user = Keypair.generate();
  const transferAuthority = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let mint: PublicKey;

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

    const airdropTransferAuthority = await provider.connection.requestAirdrop(
      transferAuthority.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTransferAuthority);

    const airdropTarget = await provider.connection.requestAirdrop(
      target.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTarget);

    const airdropIncorrectTarget = await provider.connection.requestAirdrop(
      incorrectTarget.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropIncorrectTarget);

    // create rental mint
    [issuerTokenAccountId, mint] = await createMint(
      provider.connection,
      new Wallet(user)
    );
  });

  it("Issue token with transfer authority", async () => {
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const transaction = new Transaction();
    const tokenManagerId = findTokenManagerAddress(mint);
    const mintCounterId = findMintCounterId(mint);
    const tokenManagerInitIx = await tmManagerProgram.methods
      .init({
        amount: new BN(1),
        kind: TokenManagerKind.Managed,
        invalidationType: InvalidationType.Release,
        numInvalidators: 1,
      })
      .accounts({
        tokenManager: tokenManagerId,
        mintCounter: mintCounterId,
        mint: mint,
        issuer: user.publicKey,
        payer: user.publicKey,
        issuerTokenAccount: issuerTokenAccountId,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(tokenManagerInitIx);
    const setTransferAuthorityIx = await tmManagerProgram.methods
      .setTransferAuthority(transferAuthority.publicKey)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: user.publicKey,
      })
      .instruction();
    transaction.add(setTransferAuthorityIx);
    const tokenManagerTokenAccountId =
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        provider.connection,
        mint,
        tokenManagerId,
        user.publicKey,
        true
      );
    const mintManagerId = findMintManagerId(mint);
    const createMintManagerIx = await tmManagerProgram.methods
      .createMintManager()
      .accounts({
        mintManager: mintManagerId,
        mint: mint,
        freezeAuthority: user.publicKey,
        payer: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(createMintManagerIx);

    const issueIx = await tmManagerProgram.methods
      .issue()
      .accounts({
        tokenManager: tokenManagerId,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        issuer: user.publicKey,
        issuerTokenAccount: issuerTokenAccountId,
        payer: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(issueIx);

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
    expect(tokenManagerData.parsed.mint.toString()).toEqual(mint.toString());
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      user.publicKey.toString()
    );
    expect(tokenManagerData.parsed.transferAuthority?.toString()).toEqual(
      transferAuthority.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");
  });

  it("Claim", async () => {
    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(mint);

    const transaction = await claimToken(
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

    const recipientTokenAccountId = await findAta(mint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);
  });

  it("Create transfer receipt", async () => {
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(mint);
    const transferReceiptId = findTransferReceiptId(tokenManagerId);
    const createTransferReceiptIx = await tmManagerProgram.methods
      .createTransferReceipt(target.publicKey)
      .accounts({
        tokenManager: tokenManagerId,
        transferAuthority: transferAuthority.publicKey,
        transferReceipt: transferReceiptId,
        payer: transferAuthority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    const tx = new Transaction();
    tx.add(createTransferReceiptIx);
    await executeTransaction(
      provider.connection,
      tx,
      new Wallet(transferAuthority)
    );

    const transferReceipt = await tokenManager.accounts.getTransferReceipt(
      provider.connection,
      transferReceiptId
    );
    expect(transferReceipt.parsed.target.toString()).toEqual(
      target.publicKey.toString()
    );
    expect(transferReceipt.parsed.tokenManager.toString()).toEqual(
      tokenManagerId.toString()
    );
    expect(transferReceipt.parsed.mintCount.toString()).toEqual(
      new BN(1).toString()
    );
  });

  it("Fail transfer", async () => {
    const tx = await withTransfer(
      new Transaction(),
      provider.connection,
      new Wallet(incorrectTarget),
      mint,
      incorrectTarget.publicKey
    );
    await expect(
      executeTransaction(provider.connection, tx, new Wallet(incorrectTarget))
    ).rejects.toThrow();
  });

  it("Transfer", async () => {
    const tx = await withTransfer(
      new Transaction(),
      provider.connection,
      new Wallet(target),
      mint
    );
    await executeTransaction(provider.connection, tx, new Wallet(target));

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(mint);
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

    const recipientTokenAccountId = await findAta(mint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("0");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(false);

    const targetTokenAccountId = await findAta(mint, target.publicKey);
    const targetTokenAccount = await getAccount(
      provider.connection,
      targetTokenAccountId
    );
    expect(targetTokenAccount.amount.toString()).toEqual("1");
    expect(targetTokenAccount.isFrozen).toEqual(true);

    expect(tokenManagerData.parsed.recipientTokenAccount.toString()).toEqual(
      targetTokenAccount.address.toString()
    );
  });
});
