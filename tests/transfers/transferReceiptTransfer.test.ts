import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import { findMintManagerId } from "@cardinal/creator-standard";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

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
  findTokenManagerAddress,
  findTransferReceiptId,
} from "../../src/programs/tokenManager/pda";

describe("Transfer receipt transfer", () => {
  const recipient = Keypair.generate();
  const target = Keypair.generate();
  const incorrectTarget = Keypair.generate();
  const user = Keypair.generate();
  const transferAuthority = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const mint: Keypair = Keypair.generate();

  beforeAll(async () => {
    const provider = await getProvider();
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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      mint.publicKey,
      user.publicKey
    );
    issuerTokenAccountId = await findAta(mint.publicKey, user.publicKey, true);
    transaction.instructions = ixs;
    await executeTransaction(provider.connection, transaction, provider.wallet);
  });

  it("Issue token with transfer authority", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const transaction = new Transaction();
    const tokenManagerId = findTokenManagerAddress(mint.publicKey);
    const mintCounterId = findMintCounterId(mint.publicKey);
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
        mint: mint.publicKey,
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
        mint.publicKey,
        tokenManagerId,
        user.publicKey,
        true
      );
    const mintManagerId = findMintManagerId(mint.publicKey);
    const createMintManagerIx = await tmManagerProgram.methods
      .createMintManager()
      .accounts({
        mintManager: mintManagerId,
        mint: mint.publicKey,
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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      mint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );
    expect(tokenManagerData.parsed.transferAuthority?.toString()).to.eq(
      transferAuthority.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");
  });

  it("Claim", async () => {
    const provider = await getProvider();

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      mint.publicKey
    );

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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    const recipientTokenAccountId = await findAta(
      mint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);
  });

  it("Create transfer receipt", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      mint.publicKey
    );
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
    expect(transferReceipt.parsed.target.toString()).to.eq(
      target.publicKey.toString()
    );
    expect(transferReceipt.parsed.tokenManager.toString()).to.eq(
      tokenManagerId.toString()
    );
    expect(transferReceipt.parsed.mintCount.toString()).to.eq(
      new BN(1).toString()
    );
  });

  it("Fail transfer", async () => {
    const provider = await getProvider();

    const tx = await withTransfer(
      new Transaction(),
      provider.connection,
      new Wallet(incorrectTarget),
      mint.publicKey,
      incorrectTarget.publicKey
    );
    expect(
      executeTransaction(provider.connection, tx, new Wallet(incorrectTarget))
    ).to.throw();
  });

  it("Transfer", async () => {
    const provider = await getProvider();
    const tx = await withTransfer(
      new Transaction(),
      provider.connection,
      new Wallet(target),
      mint.publicKey
    );
    await executeTransaction(provider.connection, tx, new Wallet(target));

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      mint.publicKey
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

    const recipientTokenAccountId = await findAta(
      mint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("0");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(false);

    const targetTokenAccountId = await findAta(
      mint.publicKey,
      target.publicKey
    );
    const targetTokenAccount = await getAccount(
      provider.connection,
      targetTokenAccountId
    );
    expect(targetTokenAccount.amount.toString()).to.eq("1");
    expect(targetTokenAccount.isFrozen).to.eq(true);

    expect(tokenManagerData.parsed.recipientTokenAccount.toString()).to.eq(
      targetTokenAccount.address.toString()
    );
  });
});
