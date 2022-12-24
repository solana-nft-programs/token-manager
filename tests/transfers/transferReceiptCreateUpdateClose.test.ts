import {
  createMintIxs,
  executeTransaction,
  findAta,
  tryGetAccount,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { claimToken } from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import {
  closeTransferReceipt,
  createTransferReceipt,
  setTransferAuthority,
  updateTransferReceipt,
} from "../../src/programs/tokenManager/instruction";
import { getProvider } from "../workspace";

describe("Transfer receipt create update close", () => {
  const recipient = Keypair.generate();
  const closer = Keypair.generate();
  const target = Keypair.generate();
  const target2 = Keypair.generate();
  const user = Keypair.generate();
  const transferAuthority = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const mint: Keypair = Keypair.generate();

  beforeAll(async () => {
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

    // create rental mint
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      mint.publicKey,
      user.publicKey
    );
    issuerTokenAccountId = await findAta(mint.publicKey, user.publicKey, true);
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
  });

  it("Issue token with transfer authority", async () => {
    const provider = getProvider();

    const transaction = new Transaction();
    const [tokenManagerIx, tokenManagerId] =
      await tokenManager.instruction.init(
        provider.connection,
        new Wallet(user),
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
        new Wallet(user),
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
          new Wallet(user),
          mint.publicKey
        )
      )[0]
    );

    transaction.add(
      tokenManager.instruction.issue(
        provider.connection,
        new Wallet(user),
        tokenManagerId,
        tokenManagerTokenAccountId,
        issuerTokenAccountId
      )
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
    const provider = getProvider();

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
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

  it("Fail transfer receipt", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const [ix] = await createTransferReceipt(
      provider.connection,
      new Wallet(user),
      tokenManagerId,
      target.publicKey
    );
    const tx = new Transaction();
    tx.add(ix);
    expect(
      executeTransaction(provider.connection, tx, new Wallet(recipient))
    ).to.throw();
  });

  it("Create transfer receipt", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const tx = new Transaction();
    const [ix, transferReceiptId] = await createTransferReceipt(
      provider.connection,
      new Wallet(transferAuthority),
      tokenManagerId,
      target.publicKey
    );
    tx.add(ix);
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

  it("Update transfer receipt", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const [ix, transferReceiptId] = await updateTransferReceipt(
      provider.connection,
      new Wallet(transferAuthority),
      tokenManagerId,
      target2.publicKey
    );
    const tx = new Transaction();
    tx.add(ix);
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
      target2.publicKey.toString()
    );
    expect(transferReceipt.parsed.tokenManager.toString()).to.eq(
      tokenManagerId.toString()
    );
    expect(transferReceipt.parsed.mintCount.toString()).to.eq(
      new BN(1).toString()
    );
  });

  it("Close transfer receipt", async () => {
    const provider = getProvider();
    const balanceBefore = await provider.connection.getBalance(
      closer.publicKey
    );
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const [ix, transferReceiptId] = await closeTransferReceipt(
      provider.connection,
      new Wallet(transferAuthority),
      tokenManagerId,
      closer.publicKey
    );
    const tx = new Transaction();
    tx.add(ix);
    await executeTransaction(
      provider.connection,
      tx,
      new Wallet(transferAuthority)
    );

    const transferReceipt = await tryGetAccount(() =>
      tokenManager.accounts.getTransferReceipt(
        provider.connection,
        transferReceiptId
      )
    );
    expect(transferReceipt).to.eq(null);

    const balanceAfter = await provider.connection.getBalance(closer.publicKey);
    expect(balanceAfter).to.be.greaterThan(balanceBefore);
  });
});
