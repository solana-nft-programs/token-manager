import {
  createMintIxs,
  emptyWallet,
  executeTransaction,
  findAta,
  getProvider,
  tryGetAccount,
} from "@cardinal/common";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { withInit } from "@cardinal/payment-manager/dist/cjs/transaction";
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  withAcceptTransfer,
  withCancelTransfer,
  withInitMarketplace,
  withInitTransfer,
  withInitTransferAuthority,
  withWrapToken,
} from "../../src";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import {
  getMarketplaceByName,
  getTransfer,
  getTransferAuthorityByName,
} from "../../src/programs/transferAuthority/accounts";
import { findTransferAddress } from "../../src/programs/transferAuthority/pda";

describe("Private Transfer", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const from = Keypair.generate();
  const to = Keypair.generate();
  let fromTokenAccountId: PublicKey;
  const tokenMint: Keypair = Keypair.generate();

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);

  beforeAll(async () => {
    const provider = await getProvider();

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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      tokenMint.publicKey,
      from.publicKey
    );
    fromTokenAccountId = await findAta(
      tokenMint.publicKey,
      from.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
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
    const tx = new Transaction();
    tx.instructions = [
      ...metadataTx.instructions,
      ...masterEditionTx.instructions,
    ];
    await executeTransaction(provider.connection, tx, new Wallet(from));

    const pmtx = new Transaction();
    await withInit(pmtx, provider.connection, provider.wallet, {
      paymentManagerName: paymentManagerName,
      feeCollectorId: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE.toNumber(),
      takerFeeBasisPoints: TAKER_FEE.toNumber(),
      includeSellerFeeBasisPoints: true,
      royaltyFeeShare: new BN(0),
      payer: provider.wallet.publicKey,
    });
    await executeTransaction(provider.connection, pmtx, provider.wallet);
  });

  it("Create Transfer Authority", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withInitTransferAuthority(
      transaction,
      provider.connection,
      provider.wallet,
      transferAuthorityName
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkTransferAuthority = await getTransferAuthorityByName(
      provider.connection,
      transferAuthorityName
    );

    expect(checkTransferAuthority.parsed.name).to.eq(transferAuthorityName);
    expect(checkTransferAuthority.parsed.authority.toString()).to.eq(
      provider.wallet.publicKey.toString()
    );
    expect(checkTransferAuthority.parsed.allowedMarketplaces).to.be.null;
  });

  it("Wrap Token", async () => {
    const provider = await getProvider();
    const wrapTransaction = new Transaction();

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      new Wallet(from),
      tokenMint.publicKey,
      { transferAuthorityName: transferAuthorityName }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      new Wallet(from)
    );
    const mintTokenAccountId = await findAta(
      tokenMint.publicKey,
      from.publicKey,
      true
    );
    const mintTokenAccount = await getAccount(
      provider.connection,
      mintTokenAccountId
    );
    expect(mintTokenAccount.amount.toString()).to.equal("1");
    expect(mintTokenAccount.isFrozen).to.be.true;
  });

  it("Create Marketplace", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withInitMarketplace(
      transaction,
      provider.connection,
      provider.wallet,
      marketplaceName,
      paymentManagerName
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkMarketplace = await getMarketplaceByName(
      provider.connection,
      marketplaceName
    );

    expect(checkMarketplace.parsed.name).to.eq(marketplaceName);
    const paymentManagerId = findPaymentManagerAddress(paymentManagerName);
    expect(checkMarketplace.parsed.paymentManager.toString()).to.eq(
      paymentManagerId.toString()
    );
    expect(checkMarketplace.parsed.authority.toString()).to.eq(
      provider.wallet.publicKey.toString()
    );
    expect(checkMarketplace.parsed.paymentMints).to.be.null;
  });

  it("Init Transfer", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withInitTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      to.publicKey,
      tokenMint.publicKey,
      fromTokenAccountId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
    );

    const checkTransfer = await getTransfer(
      provider.connection,
      tokenMint.publicKey
    );

    const [tokenManagerId] = await findTokenManagerAddress(tokenMint.publicKey);
    expect(checkTransfer.parsed.tokenManager.toString()).to.eq(
      tokenManagerId.toString()
    );
    expect(checkTransfer.parsed.from.toString()).to.eq(
      from.publicKey.toString()
    );
    expect(checkTransfer.parsed.to.toString()).to.eq(to.publicKey.toString());
  });

  it("Cancel Transfer", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withCancelTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      tokenMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
    );

    const checkTransferData = await tryGetAccount(() =>
      getTransfer(provider.connection, tokenMint.publicKey)
    );
    expect(checkTransferData).to.be.null;
  });

  it("Init Transfer", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withInitTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      to.publicKey,
      tokenMint.publicKey,
      fromTokenAccountId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
    );

    const checkTransfer = await getTransfer(
      provider.connection,
      tokenMint.publicKey
    );

    const [tokenManagerId] = await findTokenManagerAddress(tokenMint.publicKey);
    expect(checkTransfer.parsed.tokenManager.toString()).to.eq(
      tokenManagerId.toString()
    );
    expect(checkTransfer.parsed.from.toString()).to.eq(
      from.publicKey.toBase58()
    );
    expect(checkTransfer.parsed.to.toString()).to.eq(to.publicKey.toString());
  });

  it("Accept Transfer", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withAcceptTransfer(
      transaction,
      provider.connection,
      emptyWallet(to.publicKey),
      tokenMint.publicKey,
      to.publicKey,
      from.publicKey
    );
    await executeTransaction(provider.connection, transaction, new Wallet(to));

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
    const toTokenAccountData = await getAccount(
      provider.connection,
      toTokenAccountId
    );
    expect(toTokenAccountData.amount.toString()).to.be.equal("1");
    expect(toTokenAccountData.isFrozen).to.be.true;

    const fromTokenAccountId = await findAta(
      tokenMint.publicKey,
      from.publicKey,
      true
    );
    const fromTokenAccountData = await getAccount(
      provider.connection,
      fromTokenAccountId
    );
    expect(fromTokenAccountData.amount.toString()).to.be.equal("0");
    expect(fromTokenAccountData.isFrozen).to.be.false;
  });
});
