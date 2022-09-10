import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { expectTXTable } from "@saberhq/chai-solana";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  withCreateListing,
  withInitListingAuthority,
  withInitMarketplace,
} from "../../src";
import {
  getListing,
  getListingAuthority,
  getMarketplaceByName,
} from "../../src/programs/listingAuthority/accounts";
import {
  findListingAuthorityAddress,
  findMarketplaceAddress,
} from "../../src/programs/listingAuthority/pda";
import { init } from "../../src/programs/paymentManager/instruction";
import { findPaymentManagerAddress } from "../../src/programs/paymentManager/pda";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import { createMint } from "../utils";
import { getProvider } from "../workspace";

describe("Create and Extend Rental", () => {
  const listingAuthorityName = `listing-authority-${Math.random()}`;
  const marketplaceName = `marketplace-${Math.random()}`;

  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: Token;
  const rentalPaymentAmount = new BN(1);
  const rentalPaymentMint = new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

  const paymentManagerName = `payment-manager-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = 500;
  const TAKER_FEE = 0;
  //   const BASIS_POINTS_DIVISOR = 10000;

  before(async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    transaction.add(
      (
        await init(provider.connection, provider.wallet, paymentManagerName, {
          feeCollector: feeCollector.publicKey,
          makerFeeBasisPoints: MAKER_FEE,
          takerFeeBasisPoints: TAKER_FEE,
        })
      )[0]
    );

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      tokenCreator.publicKey,
      1,
      tokenCreator.publicKey
    );

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

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [
        ...transaction.instructions,
        ...metadataTx.instructions,
        ...masterEditionTx.instructions,
      ]
    );

    await expectTXTable(txEnvelope, "Create Payment Manager", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
  });

  it("Create Listing Authority", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withInitListingAuthority(
      transaction,
      provider.connection,
      provider.wallet,
      listingAuthorityName,
      provider.wallet.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "create listing authority", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkListingAuthority = await getListingAuthority(
      provider.connection,
      listingAuthorityName
    );

    expect(checkListingAuthority.parsed.name).to.eq(listingAuthorityName);
    expect(checkListingAuthority.parsed.authority).to.eqAddress(
      provider.wallet.publicKey
    );
    expect(checkListingAuthority.parsed.allowedMarketplaces).to.be.null;
  });

  it("Create Marketplace", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withInitMarketplace(
      transaction,
      provider.connection,
      provider.wallet,
      marketplaceName,
      listingAuthorityName,
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

    expect(checkMarketplace.parsed.name).to.eq(listingAuthorityName);
    const [listingAuthorityId] = await findListingAuthorityAddress(
      listingAuthorityName
    );
    expect(checkMarketplace.parsed.listingAuthority).to.eqAddress(
      listingAuthorityId
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
    expect(checkMarketplace.parsed.paymentMints).to.equal([]);
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

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "create listing", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );

    expect(checkListing.parsed.lister).to.eqAddress(provider.wallet.publicKey);
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );
    expect(checkListing.parsed.tokenManager).to.eqAddress(tokenManagerId);
    const [marketplaceId] = await findMarketplaceAddress(marketplaceName);
    expect(checkListing.parsed.marketplace).to.eqAddress(marketplaceId);
    expect(checkListing.parsed.paymentAmount).to.eq(rentalPaymentAmount);
    expect(checkListing.parsed.paymentAmount).to.eqAddress(rentalPaymentMint);
  });
});
