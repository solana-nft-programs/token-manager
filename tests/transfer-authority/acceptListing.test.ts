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
import { DEFAULT_BUY_SIDE_FEE_SHARE } from "@solana-nft-programs/payment-manager";
import { findPaymentManagerAddress } from "@solana-nft-programs/payment-manager/dist/cjs/pda";
import { withInit } from "@solana-nft-programs/payment-manager/dist/cjs/transaction";
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

describe("Accept Listing", () => {
  let provider: SolanaProvider;
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  let rentalMint: PublicKey;
  const rentalPaymentAmount = new BN(1197485);

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(360);
  const TAKER_FEE = new BN(640);
  const BASIS_POINTS_DIVISOR = new BN(10000);
  const ROYALTY_FEE_SHARE = new BN(3241);
  const includeSellerFeeBasisPoints = true;
  const sellerFeeBasisPoints = new BN(147);
  const buySideReceiver = Keypair.generate();

  const creator1 = Keypair.generate();
  const creator2 = Keypair.generate();
  const creator3 = Keypair.generate();
  const creator4 = Keypair.generate();
  const creator5 = Keypair.generate();
  const creator1Share = new BN(24);
  const creator2Share = new BN(26);
  const creator3Share = new BN(8);
  const creator4Share = new BN(19);
  const creator5Share = new BN(23);

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
    const airdropBuySideReceiver = await provider.connection.requestAirdrop(
      buySideReceiver.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropBuySideReceiver);
    const airdropCreator1 = await provider.connection.requestAirdrop(
      creator1.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator1);
    const airdropCreator2 = await provider.connection.requestAirdrop(
      creator2.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator2);
    const airdropCreator3 = await provider.connection.requestAirdrop(
      creator3.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator3);
    const airdropCreator4 = await provider.connection.requestAirdrop(
      creator4.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator4);
    const airdropCreator5 = await provider.connection.requestAirdrop(
      creator5.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator5);

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
            sellerFeeBasisPoints: sellerFeeBasisPoints.toNumber(),
            creators: [
              {
                address: creator1.publicKey,
                verified: false,
                share: creator1Share.toNumber(),
              },
              {
                address: creator2.publicKey,
                verified: false,
                share: creator2Share.toNumber(),
              },
              {
                address: creator3.publicKey,
                verified: false,
                share: creator3Share.toNumber(),
              },
              {
                address: creator4.publicKey,
                verified: false,
                share: creator4Share.toNumber(),
              },
              {
                address: creator5.publicKey,
                verified: false,
                share: creator5Share.toNumber(),
              },
            ],
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
      includeSellerFeeBasisPoints: includeSellerFeeBasisPoints,
      royaltyFeeShare: ROYALTY_FEE_SHARE,
      authority: provider.wallet.publicKey,
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

    const tx = new Transaction();
    tx.instructions = wrapTransaction.instructions;
    await executeTransaction(provider.connection, tx, new Wallet(lister));

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
    expect(checkMarketplace.parsed.paymentMints).toBeNull();
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
      provider.wallet,
      { signers: [lister] }
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

  it("Accept Listing Different Amount Fail", async () => {
    const transaction = new Transaction();
    const checkListing = await getListing(provider.connection, rentalMint);

    try {
      await withAcceptListing(
        transaction,
        provider.connection,
        provider.wallet,
        buyer.publicKey,
        rentalMint,
        checkListing.parsed.paymentAmount.add(new BN(1)),
        checkListing.parsed.paymentMint
      );
    } catch (e) {
      if (e !== "Listing data does not match expected values") {
        throw e;
      }
    }

    await expect(
      executeTransaction(provider.connection, transaction, provider.wallet, {
        signers: [buyer],
      })
    ).rejects.toThrow();
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
    const beforeBuyerAmount =
      (await provider.connection.getAccountInfo(buyer.publicKey))?.lamports ||
      0;
    const beforeCreator1Amount =
      (await provider.connection.getAccountInfo(creator1.publicKey))
        ?.lamports || 0;
    const beforeCreator2Amount =
      (await provider.connection.getAccountInfo(creator2.publicKey))
        ?.lamports || 0;
    const beforeCreator3Amount =
      (await provider.connection.getAccountInfo(creator3.publicKey))
        ?.lamports || 0;
    const beforeCreator4Amount =
      (await provider.connection.getAccountInfo(creator4.publicKey))
        ?.lamports || 0;
    const beforeCreator5Amount =
      (await provider.connection.getAccountInfo(creator5.publicKey))
        ?.lamports || 0;
    const beforeBuysideAmount =
      (await provider.connection.getAccountInfo(buySideReceiver.publicKey))
        ?.lamports || 0;
    const beforeFeeCollectorAmount =
      (await provider.connection.getAccountInfo(feeCollector.publicKey))
        ?.lamports || 0;

    try {
      await withAcceptListing(
        transaction,
        provider.connection,
        provider.wallet,
        buyer.publicKey,
        rentalMint,
        checkListing.parsed.paymentAmount,
        checkListing.parsed.paymentMint,
        buySideReceiver.publicKey
      );
    } catch (e) {
      if (e !== "Listing data does not match expected values") {
        throw e;
      }
    }

    await executeTransaction(
      provider.connection,
      transaction,
      provider.wallet,
      { signers: [buyer] }
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
    let totalFees = makerFee.add(takerFee);
    let feesPaidOut = new BN(0);
    const sellerFee = includeSellerFeeBasisPoints
      ? rentalPaymentAmount
          .mul(new BN(sellerFeeBasisPoints))
          .div(BASIS_POINTS_DIVISOR)
      : new BN(0);
    const totalCreatorsFee = totalFees
      .mul(ROYALTY_FEE_SHARE)
      .div(BASIS_POINTS_DIVISOR)
      .add(sellerFee);
    totalFees = totalFees.add(sellerFee);
    let cretorsFeeRemainder = includeSellerFeeBasisPoints
      ? totalCreatorsFee
          .sub(
            [
              totalCreatorsFee.mul(creator1Share),
              totalCreatorsFee.mul(creator2Share),
              totalCreatorsFee.mul(creator3Share),
              totalCreatorsFee.mul(creator4Share),
              totalCreatorsFee.mul(creator5Share),
            ]
              .reduce((partialSum, a) => partialSum.add(a), new BN(0))
              .div(new BN(100))
          )
          .toNumber()
      : 0;
    const creator1Funds = totalCreatorsFee
      .mul(creator1Share)
      .div(new BN(100))
      .add(new BN(cretorsFeeRemainder > 0 ? 1 : 0));
    feesPaidOut = feesPaidOut.add(creator1Funds);
    const creator1Info = await provider.connection.getAccountInfo(
      creator1.publicKey
    );
    expect(Number(creator1Info?.lamports)).toEqual(
      beforeCreator1Amount + creator1Funds.toNumber()
    );
    cretorsFeeRemainder = cretorsFeeRemainder > 0 ? cretorsFeeRemainder - 1 : 0;

    const creator2Funds = totalCreatorsFee
      .mul(creator2Share)
      .div(new BN(100))
      .add(new BN(cretorsFeeRemainder > 0 ? 1 : 0));
    feesPaidOut = feesPaidOut.add(creator2Funds);
    const creator2Info = await provider.connection.getAccountInfo(
      creator2.publicKey
    );
    expect(Number(creator2Info?.lamports)).toEqual(
      beforeCreator2Amount + creator2Funds.toNumber()
    );
    cretorsFeeRemainder = cretorsFeeRemainder > 0 ? cretorsFeeRemainder - 1 : 0;

    const creator3Funds = totalCreatorsFee
      .mul(creator3Share)
      .div(new BN(100))
      .add(new BN(cretorsFeeRemainder > 0 ? 1 : 0));
    feesPaidOut = feesPaidOut.add(creator3Funds);
    const creator3Info = await provider.connection.getAccountInfo(
      creator3.publicKey
    );
    expect(Number(creator3Info?.lamports)).toEqual(
      beforeCreator3Amount + creator3Funds.toNumber()
    );
    cretorsFeeRemainder = cretorsFeeRemainder > 0 ? cretorsFeeRemainder - 1 : 0;

    const creator4Funds = totalCreatorsFee
      .mul(creator4Share)
      .div(new BN(100))
      .add(new BN(cretorsFeeRemainder > 0 ? 1 : 0));
    feesPaidOut = feesPaidOut.add(creator4Funds);
    const creator4Info = await provider.connection.getAccountInfo(
      creator4.publicKey
    );
    expect(Number(creator4Info?.lamports)).toEqual(
      beforeCreator4Amount + creator4Funds.toNumber()
    );
    cretorsFeeRemainder = cretorsFeeRemainder > 0 ? cretorsFeeRemainder - 1 : 0;

    const creator5Funds = totalCreatorsFee
      .mul(creator5Share)
      .div(new BN(100))
      .add(new BN(cretorsFeeRemainder > 0 ? 1 : 0));
    feesPaidOut = feesPaidOut.add(creator5Funds);
    const creator5Info = await provider.connection.getAccountInfo(
      creator5.publicKey
    );
    expect(Number(creator5Info?.lamports)).toEqual(
      beforeCreator5Amount + creator5Funds.toNumber()
    );
    cretorsFeeRemainder = cretorsFeeRemainder > 0 ? cretorsFeeRemainder - 1 : 0;

    const buySideFee = rentalPaymentAmount
      .mul(new BN(DEFAULT_BUY_SIDE_FEE_SHARE))
      .div(BASIS_POINTS_DIVISOR);
    const buySideReceiverInfo = await provider.connection.getAccountInfo(
      buySideReceiver.publicKey
    );
    expect(Number(buySideReceiverInfo?.lamports)).toEqual(
      beforeBuysideAmount + buySideFee.toNumber()
    );
    const feeCollectorInfo = await provider.connection.getAccountInfo(
      feeCollector.publicKey
    );
    expect(Number(feeCollectorInfo?.lamports)).toEqual(
      beforeFeeCollectorAmount + totalFees.sub(feesPaidOut).toNumber()
    );

    const listerInfo = await provider.connection.getAccountInfo(
      lister.publicKey
    );
    expect(Number(listerInfo?.lamports)).toEqual(
      beforeListerAmount +
        rentalPaymentAmount
          .add(takerFee)
          .sub(totalFees)
          .sub(buySideFee)
          .toNumber() +
        (listingInfo?.lamports || 0)
    );

    const afterBuyerAmount =
      (await provider.connection.getAccountInfo(buyer.publicKey))?.lamports ||
      0;

    // account for gas fees
    expect(beforeBuyerAmount - afterBuyerAmount).toEqual(
      rentalPaymentAmount.add(takerFee).toNumber()
    );
  });
});
