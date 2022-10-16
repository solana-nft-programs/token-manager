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

import { claimToken, findAta, tryGetAccount } from "../../src";
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
import { createMint } from "../utils";
import { getProvider } from "../workspace";

describe("Transfer receipt create update close", () => {
  const recipient = Keypair.generate();
  const closer = Keypair.generate();
  const target = Keypair.generate();
  const target2 = Keypair.generate();
  const tokenCreator = Keypair.generate();
  const transferAuthority = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let mint: Token;

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

    const airdropTransferAuthority = await provider.connection.requestAirdrop(
      transferAuthority.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTransferAuthority);

    // create rental mint
    [issuerTokenAccountId, mint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1,
      provider.wallet.publicKey
    );
  });

  it("Issue token with transfer authority", async () => {
    const provider = getProvider();

    const transaction = new Transaction();
    const [tokenManagerIx, tokenManagerId] =
      await tokenManager.instruction.init(
        provider.connection,
        provider.wallet,
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
        provider.wallet,
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
        provider.wallet.publicKey,
        true
      );

    transaction.add(
      (
        await tokenManager.instruction.creatMintManager(
          provider.connection,
          provider.wallet,
          mint.publicKey
        )
      )[0]
    );

    transaction.add(
      tokenManager.instruction.issue(
        provider.connection,
        provider.wallet,
        tokenManagerId,
        tokenManagerTokenAccountId,
        issuerTokenAccountId
      )
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
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
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );
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

  it("Fail transfer receipt", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    await expectTXTable(
      new TransactionEnvelope(
        SolanaProvider.init({
          connection: provider.connection,
          wallet: new SignerWallet(recipient),
          opts: provider.opts,
        }),
        [
          (
            await createTransferReceipt(
              provider.connection,
              provider.wallet,
              tokenManagerId,
              target.publicKey
            )
          )[0],
        ]
      ),
      "use",
      {
        verbosity: "error",
        formatLogs: true,
      }
    ).to.be.rejectedWith(Error);
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

  it("Update transfer receipt", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      mint.publicKey
    );
    const [ix, transferReceiptId] = await updateTransferReceipt(
      provider.connection,
      new SignerWallet(transferAuthority),
      tokenManagerId,
      target2.publicKey
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
      new SignerWallet(transferAuthority),
      tokenManagerId,
      closer.publicKey
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
