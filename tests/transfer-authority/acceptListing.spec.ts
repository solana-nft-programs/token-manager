import { DEFAULT_BUY_SIDE_FEE_SHARE } from "@cardinal/payment-manager";
import { init } from "@cardinal/payment-manager/dist/cjs/instruction";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  Creator,
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
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  emptyWallet,
  findAta,
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
import { createMint } from "../utils";
import { getProvider } from "../workspace";

describe("Accept Listing", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  let rentalMint: Token;
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

  before(async () => {
    const provider = getProvider();

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
    [, rentalMint] = await createMint(
      provider.connection,
      lister,
      lister.publicKey,
      1,
      lister.publicKey
    );

    const metadataId = await Metadata.getPDA(rentalMint.publicKey);
    const metadataTx = new CreateMetadataV2(
      { feePayer: lister.publicKey },
      {
        metadata: metadataId,
        metadataData: new DataV2({
          name: "test",
          symbol: "TST",
          uri: "http://test/",
          sellerFeeBasisPoints: sellerFeeBasisPoints.toNumber(),
          creators: [
            new Creator({
              address: creator1.publicKey.toString(),
              verified: false,
              share: creator1Share.toNumber(),
            }),
            new Creator({
              address: creator2.publicKey.toString(),
              verified: false,
              share: creator2Share.toNumber(),
            }),
            new Creator({
              address: creator3.publicKey.toString(),
              verified: false,
              share: creator3Share.toNumber(),
            }),
            new Creator({
              address: creator4.publicKey.toString(),
              verified: false,
              share: creator4Share.toNumber(),
            }),
            new Creator({
              address: creator5.publicKey.toString(),
              verified: false,
              share: creator5Share.toNumber(),
            }),
          ],
          collection: null,
          uses: null,
        }),
        updateAuthority: lister.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: lister.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(rentalMint.publicKey);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: lister.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: lister.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: lister.publicKey,
        maxSupply: new BN(1),
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(lister),
        opts: provider.opts,
      }),
      [...metadataTx.instructions, ...masterEditionTx.instructions]
    );

    await expectTXTable(txEnvelope, "Create Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const ix = init(provider.connection, provider.wallet, paymentManagerName, {
      paymentManagerId: paymentManagerId,
      feeCollector: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE.toNumber(),
      takerFeeBasisPoints: TAKER_FEE.toNumber(),
      includeSellerFeeBasisPoints: includeSellerFeeBasisPoints,
      royaltyFeeShare: ROYALTY_FEE_SHARE,
      authority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
    });
    const pmTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [ix]
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
      emptyWallet(lister.publicKey),
      rentalMint.publicKey,
      { transferAuthorityName: transferAuthorityName }
    );

    const wrapTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...wrapTransaction.instructions],
      [lister]
    );

    await expectTXTable(wrapTxEnvelope, "Wrap Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkMint = new splToken.Token(
      provider.connection,
      rentalMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const mintTokenAccountId = await findAta(
      rentalMint.publicKey,
      lister.publicKey,
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

  it("Create Listing", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      emptyWallet(lister.publicKey),
      rentalMint.publicKey,
      marketplaceName,
      rentalPaymentAmount
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [lister]
    );
    await expectTXTable(txEnvelope, "create listing", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );

    expect(checkListing.parsed.lister).to.eqAddress(lister.publicKey);
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );
    expect(checkListing.parsed.tokenManager).to.eqAddress(tokenManagerId);
    const [marketplaceId] = await findMarketplaceAddress(marketplaceName);
    expect(checkListing.parsed.marketplace).to.eqAddress(marketplaceId);
    expect(checkListing.parsed.paymentAmount.toNumber()).to.eq(
      rentalPaymentAmount.toNumber()
    );
    expect(checkListing.parsed.paymentMint).to.eqAddress(PublicKey.default);
  });

  it("Accept Listing Different Amount Fail", async () => {
    const provider = getProvider();
    const transaction = new Transaction();
    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );

    try {
      await withAcceptListing(
        transaction,
        provider.connection,
        provider.wallet,
        buyer.publicKey,
        rentalMint.publicKey,
        checkListing.parsed.paymentAmount.add(new BN(1)),
        checkListing.parsed.paymentMint
      );
    } catch (e) {
      if (e !== "Listing data does not match expected values") {
        throw e;
      }
    }

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [buyer]
    );
    expect(async () => {
      await expectTXTable(txEnvelope, "extend", {
        verbosity: "error",
        formatLogs: true,
      }).to.be.rejectedWith(Error);
    });
  });

  it("Accept Listing", async () => {
    const provider = getProvider();
    const transaction = new Transaction();
    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );
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
        rentalMint.publicKey,
        checkListing.parsed.paymentAmount,
        checkListing.parsed.paymentMint,
        buySideReceiver.publicKey
      );
    } catch (e) {
      if (e !== "Listing data does not match expected values") {
        throw e;
      }
    }

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [buyer]
    );
    await expectTXTable(txEnvelope, "accept listing", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const buyerMintTokenAccountId = await findAta(
      rentalMint.publicKey,
      buyer.publicKey,
      true
    );
    const checkMRentalint = new splToken.Token(
      provider.connection,
      rentalMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const buyerRentalMintTokenAccount = await checkMRentalint.getAccountInfo(
      buyerMintTokenAccountId
    );
    expect(buyerRentalMintTokenAccount.amount.toNumber()).to.eq(1);
    expect(buyerRentalMintTokenAccount.isFrozen).to.be.true;

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
    expect(Number(creator1Info?.lamports)).to.eq(
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
    expect(Number(creator2Info?.lamports)).to.eq(
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
    expect(Number(creator3Info?.lamports)).to.eq(
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
    expect(Number(creator4Info?.lamports)).to.eq(
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
    expect(Number(creator5Info?.lamports)).to.eq(
      beforeCreator5Amount + creator5Funds.toNumber()
    );
    cretorsFeeRemainder = cretorsFeeRemainder > 0 ? cretorsFeeRemainder - 1 : 0;

    const buySideFee = rentalPaymentAmount
      .mul(new BN(DEFAULT_BUY_SIDE_FEE_SHARE))
      .div(BASIS_POINTS_DIVISOR);
    const buySideReceiverInfo = await provider.connection.getAccountInfo(
      buySideReceiver.publicKey
    );
    expect(Number(buySideReceiverInfo?.lamports)).to.eq(
      beforeBuysideAmount + buySideFee.toNumber()
    );
    const feeCollectorInfo = await provider.connection.getAccountInfo(
      feeCollector.publicKey
    );
    expect(Number(feeCollectorInfo?.lamports)).to.eq(
      beforeFeeCollectorAmount + totalFees.sub(feesPaidOut).toNumber()
    );

    const listerInfo = await provider.connection.getAccountInfo(
      lister.publicKey
    );
    expect(Number(listerInfo?.lamports)).to.eq(
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
    expect(
      beforeBuyerAmount -
        afterBuyerAmount -
        rentalPaymentAmount.add(takerFee).toNumber()
    ).to.be.lessThanOrEqual(5000);
  });
});
