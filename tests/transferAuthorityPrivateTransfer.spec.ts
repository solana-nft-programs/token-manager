import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import * as splToken from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  emptyWallet,
  findAta,
  tryGetAccount,
  withAcceptTransfer,
  withCancelTransfer,
  withInitMarketplace,
  withInitTransfer,
  withInitTransferAuthority,
  withWrapToken,
} from "../src";
import { init } from "../src/programs/paymentManager/instruction";
import { findPaymentManagerAddress } from "../src/programs/paymentManager/pda";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import {
  getMarketplaceByName,
  getTransfer,
  getTransferAuthorityByName,
} from "../src/programs/transferAuthority/accounts";
import {
  findTransferAddress,
  findTransferAuthorityAddress,
} from "../src/programs/transferAuthority/pda";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Private Transfer", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const from = Keypair.generate();
  const to = Keypair.generate();
  let tokenMint: Token;

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);

  before(async () => {
    const provider = getProvider();

    const airdropLister = await provider.connection.requestAirdrop(
      from.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropLister);
    const airdropBuyer = await provider.connection.requestAirdrop(
      to.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropBuyer);

    // create rental mint
    [, tokenMint] = await createMint(
      provider.connection,
      from,
      from.publicKey,
      1,
      from.publicKey
    );

    const metadataId = await Metadata.getPDA(tokenMint.publicKey);
    const metadataTx = new CreateMetadataV2(
      { feePayer: from.publicKey },
      {
        metadata: metadataId,
        metadataData: new DataV2({
          name: "test",
          symbol: "TST",
          uri: "http://test/",
          sellerFeeBasisPoints: 10,
          creators: null,
          collection: null,
          uses: null,
        }),
        updateAuthority: from.publicKey,
        mint: tokenMint.publicKey,
        mintAuthority: from.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(tokenMint.publicKey);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: from.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: from.publicKey,
        mint: tokenMint.publicKey,
        mintAuthority: from.publicKey,
        maxSupply: new BN(1),
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(from),
        opts: provider.opts,
      }),
      [...metadataTx.instructions, ...masterEditionTx.instructions]
    );

    await expectTXTable(txEnvelope, "Create Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const pmTransaction = new Transaction();
    pmTransaction.add(
      (
        await init(provider.connection, provider.wallet, paymentManagerName, {
          feeCollector: feeCollector.publicKey,
          makerFeeBasisPoints: MAKER_FEE.toNumber(),
          takerFeeBasisPoints: TAKER_FEE.toNumber(),
          includeSellerFeeBasisPoints: true,
        })
      )[0]
    );

    const pmTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...pmTransaction.instructions]
    );

    await expectTXTable(pmTxEnvelope, "Create Payment Manager", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
  });

  it("Create Transfer Authority", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withInitTransferAuthority(
      transaction,
      provider.connection,
      provider.wallet,
      transferAuthorityName
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "Create transfer authority", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkTransferAuthority = await getTransferAuthorityByName(
      provider.connection,
      transferAuthorityName
    );

    expect(checkTransferAuthority.parsed.name).to.eq(transferAuthorityName);
    expect(checkTransferAuthority.parsed.authority).to.eqAddress(
      provider.wallet.publicKey
    );
    expect(checkTransferAuthority.parsed.allowedMarketplaces).to.be.null;
  });

  it("Wrap Token", async () => {
    const provider = getProvider();
    const wrapTransaction = new Transaction();

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      emptyWallet(from.publicKey),
      tokenMint.publicKey,
      transferAuthorityName
    );

    const wrapTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...wrapTransaction.instructions],
      [from]
    );

    await expectTXTable(wrapTxEnvelope, "Wrap Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkMint = new splToken.Token(
      provider.connection,
      tokenMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const mintTokenAccountId = await findAta(
      tokenMint.publicKey,
      from.publicKey,
      true
    );
    const mintTokenAccount = await checkMint.getAccountInfo(mintTokenAccountId);
    expect(mintTokenAccount.amount.toNumber()).to.equal(1);
    expect(mintTokenAccount.isFrozen).to.be.true;
  });

  it("Create Marketplace", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withInitMarketplace(
      transaction,
      provider.connection,
      provider.wallet,
      marketplaceName,
      transferAuthorityName,
      paymentManagerName
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "create marketplace", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkMarketplace = await getMarketplaceByName(
      provider.connection,
      marketplaceName
    );

    expect(checkMarketplace.parsed.name).to.eq(marketplaceName);
    const [transferAuthorityId] = await findTransferAuthorityAddress(
      transferAuthorityName
    );
    expect(checkMarketplace.parsed.transferAuthority).to.eqAddress(
      transferAuthorityId
    );
    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    expect(checkMarketplace.parsed.paymentManager).to.eqAddress(
      paymentManagerId
    );
    expect(checkMarketplace.parsed.authority).to.eqAddress(
      provider.wallet.publicKey
    );
    expect(checkMarketplace.parsed.paymentMints).to.be.null;
  });

  it("Init Transfer", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withInitTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      to.publicKey,
      tokenMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(from),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "init transfer", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkTransfer = await getTransfer(
      provider.connection,
      tokenMint.publicKey
    );

    const [tokenManagerId] = await findTokenManagerAddress(tokenMint.publicKey);
    expect(checkTransfer.parsed.tokenManager.toString()).to.eqAddress(
      tokenManagerId
    );
    expect(checkTransfer.parsed.from.toString()).to.eqAddress(from.publicKey);
    expect(checkTransfer.parsed.to.toString()).to.eqAddress(to.publicKey);
  });

  it("Cancel Transfer", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withCancelTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      tokenMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(from),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "cancel transfer", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkTransferData = await tryGetAccount(() =>
      getTransfer(provider.connection, tokenMint.publicKey)
    );
    expect(checkTransferData).to.be.null;
  });

  it("Init Transfer", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withInitTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      to.publicKey,
      tokenMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(from),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "init transfer", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkTransfer = await getTransfer(
      provider.connection,
      tokenMint.publicKey
    );

    const [tokenManagerId] = await findTokenManagerAddress(tokenMint.publicKey);
    expect(checkTransfer.parsed.tokenManager.toString()).to.eqAddress(
      tokenManagerId
    );
    expect(checkTransfer.parsed.from.toString()).to.eqAddress(from.publicKey);
    expect(checkTransfer.parsed.to.toString()).to.eqAddress(to.publicKey);
  });

  it("Accept Transfer", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withAcceptTransfer(
      transaction,
      provider.connection,
      emptyWallet(to.publicKey),
      tokenMint.publicKey,
      to.publicKey,
      from.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(to),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "accept transfer", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const [transferId] = await findTransferAddress(tokenMint.publicKey);
    const checkTransferData = await tryGetAccount(() =>
      getTransfer(provider.connection, transferId)
    );
    expect(checkTransferData).to.be.null;

    const toTokenAccountId = await findAta(
      tokenMint.publicKey,
      to.publicKey,
      true
    );
    const toTokenAccountData = await tokenMint.getAccountInfo(toTokenAccountId);
    expect(toTokenAccountData.amount.toNumber()).to.be.equal(1);
    expect(toTokenAccountData.isFrozen).to.be.true;

    const fromTokenAccountId = await findAta(
      tokenMint.publicKey,
      from.publicKey,
      true
    );
    const fromTokenAccountData = await tokenMint.getAccountInfo(
      fromTokenAccountId
    );
    expect(fromTokenAccountData.amount.toNumber()).to.be.equal(0);
    expect(fromTokenAccountData.isFrozen).to.be.false;
  });
});
