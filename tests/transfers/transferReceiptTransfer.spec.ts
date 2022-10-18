import { withFindOrInitAssociatedTokenAccount } from "@cardinal/common";
import { BN } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { claimToken, findAta, withTransfer } from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import {
  createTransferReceipt,
  setTransferAuthority,
} from "../../src/programs/tokenManager/instruction";
import { createMint } from "../utils";
import { getProvider } from "../workspace";

describe("Transfer receipt transfer", () => {
  const recipient = Keypair.generate();
  const target = Keypair.generate();
  const incorrectTarget = Keypair.generate();
  const user = Keypair.generate();
  const transferAuthority = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let mint: Token;

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
      user,
      user.publicKey,
      1,
      user.publicKey
    );
  });

  it("Issue token with transfer authority", async () => {
    const provider = getProvider();

    const transaction = new Transaction();
    const [tokenManagerIx, tokenManagerId] =
      await tokenManager.instruction.init(
        provider.connection,
        new SignerWallet(user),
        mint.publicKey,
        issuerTokenAccountId,
        new BN(1),
        TokenManagerKind.Managed,
        InvalidationType.Release,
        1
      );
    transaction.add(tokenManagerIx);
    transaction.add(
      setTransferAuthority(
        provider.connection,
        new SignerWallet(user),
        tokenManagerId,
        transferAuthority.publicKey
      )
    );
    const tokenManagerTokenAccountId =
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        provider.connection,
        mint.publicKey,
        tokenManagerId,
        user.publicKey,
        true
      );

    transaction.add(
      (
        await tokenManager.instruction.creatMintManager(
          provider.connection,
          new SignerWallet(user),
          mint.publicKey
        )
      )[0]
    );

    transaction.add(
      tokenManager.instruction.issue(
        provider.connection,
        new SignerWallet(user),
        tokenManagerId,
        tokenManagerTokenAccountId,
        issuerTokenAccountId
      )
    );
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "create", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(mint.publicKey);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(user.publicKey);
    expect(tokenManagerData.parsed.transferAuthority).to.eqAddress(
      transferAuthority.publicKey
    );

    const checkIssuerTokenAccount = await mint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);
  });

  it("Claim", async () => {
    const provider = getProvider();

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );

    const transaction = await claimToken(
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

    await expectTXTable(txEnvelope, "claim", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await mint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await mint.getAccountInfo(
      await findAta(mint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);
  });

  it("Create transfer receipt", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const [ix, transferReceiptId] = await createTransferReceipt(
      provider.connection,
      new SignerWallet(transferAuthority),
      tokenManagerId,
      target.publicKey
    );
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(transferAuthority),
        opts: provider.opts,
      }),
      [ix]
    );
    await expectTXTable(txEnvelope, "use", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

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
    const provider = getProvider();

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(incorrectTarget),
        opts: provider.opts,
      }),
      (
        await withTransfer(
          new Transaction(),
          provider.connection,
          new SignerWallet(incorrectTarget),
          mint.publicKey,
          incorrectTarget.publicKey
        )
      ).instructions
    );
    await expectTXTable(txEnvelope, "transfer", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.rejectedWith(Error);
  });

  it("Transfer", async () => {
    const provider = getProvider();

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(target),
        opts: provider.opts,
      }),
      (
        await withTransfer(
          new Transaction(),
          provider.connection,
          new SignerWallet(target),
          mint.publicKey
        )
      ).instructions
    );

    await expectTXTable(txEnvelope, "transfer", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await mint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await mint.getAccountInfo(
      await findAta(mint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(0);
    expect(checkRecipientTokenAccount.isFrozen).to.eq(false);

    const targetTokenAccount = await mint.getAccountInfo(
      await findAta(mint.publicKey, target.publicKey)
    );
    expect(targetTokenAccount.amount.toNumber()).to.eq(1);
    expect(targetTokenAccount.isFrozen).to.eq(true);

    expect(tokenManagerData.parsed.recipientTokenAccount.toString()).to.eq(
      targetTokenAccount.address.toString()
    );
  });
});
