import { Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { getAccount } from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  findMintEditionId,
  findMintMetadataId,
  getTestProvider,
} from "@solana-nft-programs/common";
import { findPaymentManagerAddress } from "@solana-nft-programs/payment-manager/dist/cjs/pda";
import { withInit } from "@solana-nft-programs/payment-manager/dist/cjs/transaction";
import { BN } from "bn.js";

import {
  withAcceptListing,
  withCreateListing,
  withInitMarketplace,
  withInitTransferAuthority,
  withWhitelistMarektplaces,
  withWrapToken,
} from "../../src";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import {
  getListing,
  getMarketplaceByName,
  getTransferAuthorityByName,
} from "../../src/programs/transferAuthority/accounts";
import { findMarketplaceAddress } from "../../src/programs/transferAuthority/pda";

describe("Allowed markeptlaces for transfer authority", () => {
  let provider: SolanaProvider;
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();

  let rentalMint: PublicKey;
  const rentalPaymentAmount = new BN(100);

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);
  const BASIS_POINTS_DIVISOR = new BN(10000);

  beforeAll(async () => {
    provider = await getTestProvider();

    const feeCollectorInfo = await provider.connection.requestAirdrop(
      feeCollector.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(feeCollectorInfo);
    const airdropLister = await provider.connection.requestAirdrop(
      lister.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropLister);
    const airdropBuyer = await provider.connection.requestAirdrop(
      buyer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropBuyer);

    // create rental mint
    [, rentalMint] = await createMint(provider.connection, new Wallet(lister));

    const metadataId = findMintMetadataId(rentalMint);
    const metadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        updateAuthority: lister.publicKey,
        mint: rentalMint,
        mintAuthority: lister.publicKey,
        payer: lister.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: "test",
            symbol: "TST",
            uri: "http://test/",
            sellerFeeBasisPoints: 10,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    const masterEditionId = findMintEditionId(rentalMint);
    const masterEditionIx = createCreateMasterEditionV3Instruction(
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: lister.publicKey,
        mint: rentalMint,
        mintAuthority: lister.publicKey,
        payer: lister.publicKey,
      },
      {
        createMasterEditionArgs: {
          maxSupply: new BN(0),
        },
      }
    );
    const tx = new Transaction();
    tx.instructions = [metadataIx, masterEditionIx];
    await executeTransaction(provider.connection, tx, new Wallet(lister));

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
      new Wallet(lister),
      rentalMint,
      { transferAuthorityName: transferAuthorityName }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      new Wallet(lister)
    );
    const mintTokenAccountId = await findAta(
      rentalMint,
      lister.publicKey,
      true
    );
    const mintTokenAccount = await getAccount(
      provider.connection,
      mintTokenAccountId
    );
    expect(mintTokenAccount.amount.toString()).toEqual("1");
    expect(mintTokenAccount.isFrozen).toBeTruthy();
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
  });

  it("Whitelist random marketplace", async () => {
    const transaction = new Transaction();

    await withWhitelistMarektplaces(
      transaction,
      provider.connection,
      provider.wallet,
      transferAuthorityName,
      ["some-random-name"]
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkTransferAuthority = await getTransferAuthorityByName(
      provider.connection,
      transferAuthorityName
    );
    const marketplaceId = findMarketplaceAddress("some-random-name");
    expect(checkTransferAuthority.parsed.allowedMarketplaces).toEqual([
      marketplaceId,
    ]);
  });

  it("Fail to Create Listing", async () => {
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      new Wallet(lister),
      rentalMint,
      marketplaceName,
      rentalPaymentAmount
    );
    await expect(
      executeTransaction(provider.connection, transaction, provider.wallet)
    ).rejects.toThrow();
  });

  it("Whitelist proper marketplace", async () => {
    const transaction = new Transaction();

    await withWhitelistMarektplaces(
      transaction,
      provider.connection,
      provider.wallet,
      transferAuthorityName,
      [marketplaceName, "some-random-name"]
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkTransferAuthority = await getTransferAuthorityByName(
      provider.connection,
      transferAuthorityName
    );
    const randomMarketplaceId = findMarketplaceAddress("some-random-name");
    const marketplaceId = findMarketplaceAddress(marketplaceName);

    const marketplaces = (
      checkTransferAuthority.parsed.allowedMarketplaces as PublicKey[]
    ).map((m) => m.toString());
    expect(marketplaces).toContain(marketplaceId.toString());
    expect(marketplaces).toContain(randomMarketplaceId.toString());
  });

  it("Create Listing", async () => {
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      new Wallet(lister),
      rentalMint,
      marketplaceName,
      rentalPaymentAmount
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(lister)
    );

    const checkListing = await getListing(provider.connection, rentalMint);

    expect(checkListing.parsed.lister.toString()).toEqual(
      lister.publicKey.toString()
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
      PublicKey.default.toString()
    );
  });

  it("Accept Listing", async () => {
    const transaction = new Transaction();
    const checkListing = await getListing(provider.connection, rentalMint);
    const listingInfo = await provider.connection.getAccountInfo(
      checkListing.pubkey
    );

    const beforeListerAmount =
      (await provider.connection.getAccountInfo(lister.publicKey))?.lamports ||
      0;
    const beforeFeeCollectorAmount =
      (await provider.connection.getAccountInfo(feeCollector.publicKey))
        ?.lamports || 0;

    await withAcceptListing(
      transaction,
      provider.connection,
      new Wallet(buyer),
      buyer.publicKey,
      rentalMint,
      checkListing.parsed.paymentAmount,
      checkListing.parsed.paymentMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(buyer)
    );

    const buyerMintTokenAccountId = await findAta(
      rentalMint,
      buyer.publicKey,
      true
    );
    const buyerRentalMintTokenAccount = await getAccount(
      provider.connection,
      buyerMintTokenAccountId
    );
    expect(buyerRentalMintTokenAccount.amount.toString()).toEqual("1");
    expect(buyerRentalMintTokenAccount.isFrozen).toBeTruthy();

    const makerFee = rentalPaymentAmount
      .mul(MAKER_FEE)
      .div(BASIS_POINTS_DIVISOR);
    const takerFee = rentalPaymentAmount
      .mul(TAKER_FEE)
      .div(BASIS_POINTS_DIVISOR);
    const totalFees = makerFee.add(takerFee);

    const listerInfo = await provider.connection.getAccountInfo(
      lister.publicKey
    );
    expect(listerInfo?.lamports).toEqual(
      beforeListerAmount +
        rentalPaymentAmount.sub(makerFee).toNumber() +
        (listingInfo?.lamports || 0)
    );

    const feeCollectorInfo = await provider.connection.getAccountInfo(
      feeCollector.publicKey
    );
    expect(feeCollectorInfo?.lamports).toEqual(
      beforeFeeCollectorAmount + totalFees.toNumber()
    );
  });
});
