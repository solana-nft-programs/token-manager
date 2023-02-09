import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  emptyWallet,
  executeTransaction,
  findAta,
  findMintMetadataId,
  getTestProvider,
} from "@cardinal/common";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { withInit } from "@cardinal/payment-manager/dist/cjs/transaction";
import { beforeAll, expect } from "@jest/globals";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";

import {
  withAcceptListing,
  withCreateListing,
  withInitMarketplace,
  withInitTransferAuthority,
  withWrapToken,
} from "../../src";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import {
  getListing,
  getMarketplaceByName,
  getTransferAuthorityByName,
} from "../../src/programs/transferAuthority/accounts";
import { findMarketplaceAddress } from "../../src/programs/transferAuthority/pda";

describe("Accept Listing Permissioned", () => {
  let provider: CardinalProvider;
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  let mint: PublicKey;
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
    [, mint] = await createMint(provider.connection, new Wallet(lister));

    const metadataId = findMintMetadataId(mint);
    const metadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        updateAuthority: lister.publicKey,
        mint: mint,
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

    const tx = new Transaction();
    tx.instructions = [metadataIx];
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
      emptyWallet(lister.publicKey),
      mint,
      { transferAuthorityName: transferAuthorityName }
    );

    await executeTransaction(
      provider.connection,
      wrapTransaction,
      new Wallet(lister)
    );
    const mintTokenAccountId = await findAta(mint, lister.publicKey, true);
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
    expect(checkMarketplace.parsed.paymentMints).toBeNull();
  });

  it("Create Listing", async () => {
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      emptyWallet(lister.publicKey),
      mint,
      marketplaceName,
      rentalPaymentAmount,
      PublicKey.default
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(lister)
    );

    const checkListing = await getListing(provider.connection, mint);
    expect(checkListing.parsed.lister.toString()).toEqual(
      lister.publicKey.toString()
    );
    const tokenManagerId = findTokenManagerAddress(mint);
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

    const issuerTokenAccountId = await findAta(mint, lister.publicKey, true);
    const issuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(issuerTokenAccount.delegate?.toString()).toEqual(
      tokenManagerId.toString()
    );
    expect(issuerTokenAccount.amount.toString()).toEqual("1");
  });

  it("Accept Listing", async () => {
    const transaction = new Transaction();
    const checkListing = await getListing(provider.connection, mint);

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
      mint,
      checkListing.parsed.paymentAmount,
      checkListing.parsed.paymentMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(buyer)
    );

    const buyerMintTokenAccountId = await findAta(mint, buyer.publicKey, true);
    const buyermintTokenAccount = await getAccount(
      provider.connection,
      buyerMintTokenAccountId
    );
    expect(buyermintTokenAccount.amount.toString()).toEqual("1");
    expect(buyermintTokenAccount.isFrozen).toBeTruthy();

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

    const checkBuyerTokenAccountId = await findAta(mint, buyer.publicKey, true);
    const checkBuyerTokenAccount = await getAccount(
      provider.connection,
      checkBuyerTokenAccountId
    );
    expect(checkBuyerTokenAccount.delegate).toBeNull();
  });
});
