import {
  createMintIxs,
  executeTransaction,
  findAta,
  tryGetAccount,
} from "@cardinal/common";
import { init } from "@cardinal/payment-manager/dist/cjs/instruction";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  withCreateListing,
  withInitMarketplace,
  withInitTransferAuthority,
  withRemoveListing,
  withWrapToken,
} from "../../src";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import {
  getListing,
  getMarketplaceByName,
  getTransferAuthorityByName,
} from "../../src/programs/transferAuthority/accounts";
import { findMarketplaceAddress } from "../../src/programs/transferAuthority/pda";
import { getProvider } from "../workspace";

describe("Remove Listing", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const tokenCreator = Keypair.generate();
  const rentalMint: Keypair = Keypair.generate();
  const rentalPaymentAmount = new BN(1);
  const rentalPaymentMint = new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = 500;
  const TAKER_FEE = 0;
  //   const BASIS_POINTS_DIVISOR = 10000;

  before(async () => {
    const provider = getProvider();
    // create rental mint
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      provider.wallet.publicKey
    );
    transaction.instructions = ixs;
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const metadataId = await Metadata.getPDA(rentalMint.publicKey);
    const metadataTx = new CreateMetadataV2(
      { feePayer: tokenCreator.publicKey },
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
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: tokenCreator.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(rentalMint.publicKey);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: tokenCreator.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: tokenCreator.publicKey,
        maxSupply: new BN(1),
      }
    );
    const tx = new Transaction();
    tx.instructions = [
      ...metadataTx.instructions,
      ...masterEditionTx.instructions,
    ];
    await executeTransaction(provider.connection, tx, new Wallet(tokenCreator));

    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const ix = init(provider.connection, provider.wallet, paymentManagerName, {
      paymentManagerId: paymentManagerId,
      feeCollector: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE,
      takerFeeBasisPoints: TAKER_FEE,
      includeSellerFeeBasisPoints: true,
      authority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
    });
    const pmtx = new Transaction();
    pmtx.add(ix);
    await executeTransaction(provider.connection, pmtx, provider.wallet);
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
    const provider = getProvider();
    const wrapTransaction = new Transaction();

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      provider.wallet,
      rentalMint.publicKey,
      { transferAuthorityName: transferAuthorityName }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      provider.wallet
    );
  });

  it("Create Marketplace", async () => {
    const provider = getProvider();
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
    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    expect(checkMarketplace.parsed.paymentManager.toString()).to.eq(
      paymentManagerId.toString()
    );
    expect(checkMarketplace.parsed.authority.toString()).to.eq(
      provider.wallet.publicKey.toString()
    );
    expect(checkMarketplace.parsed.paymentMints).to.be.null;
  });

  it("Create Listing", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      provider.wallet,
      rentalMint.publicKey,
      marketplaceName,
      rentalPaymentAmount,
      rentalPaymentMint
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );

    expect(checkListing.parsed.lister.toString()).to.eq(
      provider.wallet.publicKey.toString()
    );
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );
    expect(checkListing.parsed.tokenManager.toString()).to.eq(
      tokenManagerId.toString()
    );
    const [marketplaceId] = await findMarketplaceAddress(marketplaceName);
    expect(checkListing.parsed.marketplace.toString()).to.eq(
      marketplaceId.toString()
    );
    expect(checkListing.parsed.paymentAmount.toNumber()).to.eq(
      rentalPaymentAmount.toNumber()
    );
    expect(checkListing.parsed.paymentMint.toString()).to.eq(
      rentalPaymentMint.toString()
    );
  });

  it("Remove Listing", async () => {
    const provider = getProvider();
    const transaction = new Transaction();
    const listerTokenAccountId = await findAta(
      rentalMint.publicKey,
      provider.wallet.publicKey
    );

    await withRemoveListing(
      transaction,
      provider.connection,
      provider.wallet,
      rentalMint.publicKey,
      listerTokenAccountId
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkListing = await tryGetAccount(() =>
      getListing(provider.connection, rentalMint.publicKey)
    );
    expect(checkListing).to.be.null;
  });
});
