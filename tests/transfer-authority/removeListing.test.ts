import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
  tryGetAccount,
} from "@cardinal/common";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { withInit } from "@cardinal/payment-manager/dist/cjs/transaction";
import { beforeAll, expect } from "@jest/globals";
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";

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

describe("Remove Listing", () => {
  let provider: CardinalProvider;
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const tokenCreator = Keypair.generate();
  let rentalMint: PublicKey;
  const rentalPaymentAmount = new BN(1);
  const rentalPaymentMint = new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = 500;
  const TAKER_FEE = 0;

  beforeAll(async () => {
    provider = await getTestProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create rental mint
    [, rentalMint] = await createMint(
      provider.connection,
      new Wallet(tokenCreator),
      {
        target: provider.wallet.publicKey,
      }
    );

    const metadataId = await Metadata.getPDA(rentalMint);
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
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(rentalMint);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: tokenCreator.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint,
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

    const pmtx = new Transaction();
    await withInit(pmtx, provider.connection, provider.wallet, {
      paymentManagerName: paymentManagerName,
      feeCollectorId: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE,
      takerFeeBasisPoints: TAKER_FEE,
      includeSellerFeeBasisPoints: true,
      royaltyFeeShare: new BN(0),
      payer: provider.wallet.publicKey,
    });
    await executeTransaction(provider.connection, pmtx, provider.wallet);
  });

  it("Create Transfer Authority", async () => {
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

    expect(checkTransferAuthority.parsed.name).toEqual(transferAuthorityName);
    expect(checkTransferAuthority.parsed.authority.toString()).toEqual(
      provider.wallet.publicKey.toString()
    );
    expect(checkTransferAuthority.parsed.allowedMarketplaces).toBeNull();
  });

  it("Wrap Token", async () => {
    const wrapTransaction = new Transaction();

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      provider.wallet,
      rentalMint,
      { transferAuthorityName: transferAuthorityName }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      provider.wallet
    );
  });

  it("Create Marketplace", async () => {
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

    expect(checkMarketplace.parsed.name).toEqual(marketplaceName);
    const paymentManagerId = findPaymentManagerAddress(paymentManagerName);
    expect(checkMarketplace.parsed.paymentManager.toString()).toEqual(
      paymentManagerId.toString()
    );
    expect(checkMarketplace.parsed.authority.toString()).toEqual(
      provider.wallet.publicKey.toString()
    );
    expect(checkMarketplace.parsed.paymentMints).toBeNull();
  });

  it("Create Listing", async () => {
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      provider.wallet,
      rentalMint,
      marketplaceName,
      rentalPaymentAmount,
      rentalPaymentMint
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkListing = await getListing(provider.connection, rentalMint);

    expect(checkListing.parsed.lister.toString()).toEqual(
      provider.wallet.publicKey.toString()
    );
    const tokenManagerId = findTokenManagerAddress(rentalMint);
    expect(checkListing.parsed.tokenManager.toString()).toEqual(
      tokenManagerId.toString()
    );
    const marketplaceId = findMarketplaceAddress(marketplaceName);
    expect(checkListing.parsed.marketplace.toString()).toEqual(
      marketplaceId.toString()
    );
    expect(checkListing.parsed.paymentAmount.toNumber()).toEqual(
      rentalPaymentAmount.toNumber()
    );
    expect(checkListing.parsed.paymentMint.toString()).toEqual(
      rentalPaymentMint.toString()
    );
  });

  it("Remove Listing", async () => {
    const transaction = new Transaction();
    const listerTokenAccountId = await findAta(
      rentalMint,
      provider.wallet.publicKey
    );

    await withRemoveListing(
      transaction,
      provider.connection,
      provider.wallet,
      rentalMint,
      listerTokenAccountId
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkListing = await tryGetAccount(() =>
      getListing(provider.connection, rentalMint)
    );
    expect(checkListing).toBeNull();
  });
});
