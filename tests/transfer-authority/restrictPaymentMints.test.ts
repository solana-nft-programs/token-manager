import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
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
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  withAcceptListing,
  withCreateListing,
  withInitMarketplace,
  withInitTransferAuthority,
  withWrapToken,
} from "../../src";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import { WSOL_MINT } from "../../src/programs/transferAuthority";
import {
  getListing,
  getMarketplaceByName,
  getTransferAuthorityByName,
} from "../../src/programs/transferAuthority/accounts";
import { findMarketplaceAddress } from "../../src/programs/transferAuthority/pda";

describe("Restrict Payment Mints", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  const customPaymentMint: Keypair = Keypair.generate();
  const rentalMint: Keypair = Keypair.generate();
  const rentalPaymentAmount = new BN(100);

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);
  const BASIS_POINTS_DIVISOR = new BN(10000);

  beforeAll(async () => {
    const provider = await getProvider();

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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      lister.publicKey
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(lister)
    );

    // create custom payment mint
    const transaction2 = new Transaction();
    const [ixs2] = await createMintIxs(
      provider.connection,
      customPaymentMint.publicKey,
      buyer.publicKey,
      { amount: 100000 }
    );
    transaction2.instructions = ixs2;
    await executeTransaction(
      provider.connection,
      transaction2,
      provider.wallet
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
          sellerFeeBasisPoints: 10,
          creators: null,
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
    const tx = new Transaction();
    tx.instructions = [
      ...metadataTx.instructions,
      ...masterEditionTx.instructions,
    ];
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
      new Wallet(lister),
      rentalMint.publicKey,
      { transferAuthorityName: transferAuthorityName }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      new Wallet(lister)
    );
    const mintTokenAccountId = await findAta(
      rentalMint.publicKey,
      lister.publicKey,
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
      paymentManagerName,
      [customPaymentMint.publicKey]
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
    expect(checkMarketplace.parsed.paymentMints).to.eql([
      customPaymentMint.publicKey,
    ]);
  });

  it("Fail to Create Listing", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      new Wallet(lister),
      rentalMint.publicKey,
      marketplaceName,
      rentalPaymentAmount,
      WSOL_MINT
    );
    expect(
      executeTransaction(provider.connection, transaction, new Wallet(lister))
    ).to.throw();
  });

  it("Create Listing", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      new Wallet(lister),
      rentalMint.publicKey,
      marketplaceName,
      rentalPaymentAmount,
      customPaymentMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(lister)
    );

    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );

    expect(checkListing.parsed.lister.toString()).to.eq(
      lister.publicKey.toString()
    );
    const tokenManagerId = findTokenManagerAddress(rentalMint.publicKey);
    expect(checkListing.parsed.tokenManager.toString()).to.eq(
      tokenManagerId.toString()
    );
    const marketplaceId = findMarketplaceAddress(marketplaceName);
    expect(checkListing.parsed.marketplace.toString()).to.eq(
      marketplaceId.toString()
    );
    expect(checkListing.parsed.paymentAmount.toNumber()).to.eq(
      rentalPaymentAmount.toNumber()
    );
    expect(checkListing.parsed.paymentMint.toString()).to.eq(
      customPaymentMint.publicKey.toString()
    );
  });

  it("Accept Listing", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();
    const checkListing = await getListing(
      provider.connection,
      rentalMint.publicKey
    );

    await withAcceptListing(
      transaction,
      provider.connection,
      new Wallet(buyer),
      buyer.publicKey,
      rentalMint.publicKey,
      checkListing.parsed.paymentAmount,
      checkListing.parsed.paymentMint
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const buyerMintTokenAccountId = await findAta(
      rentalMint.publicKey,
      buyer.publicKey,
      true
    );
    const buyerRentalMintTokenAccount = await getAccount(
      provider.connection,
      buyerMintTokenAccountId
    );
    expect(buyerRentalMintTokenAccount.amount.toString()).to.eq("1");
    expect(buyerRentalMintTokenAccount.isFrozen).to.be.true;

    const makerFee = rentalPaymentAmount
      .mul(MAKER_FEE)
      .div(BASIS_POINTS_DIVISOR);
    const takerFee = rentalPaymentAmount
      .mul(TAKER_FEE)
      .div(BASIS_POINTS_DIVISOR);
    const totalFees = makerFee.add(takerFee);

    const listerMintTokenAccountId = await findAta(
      customPaymentMint.publicKey,
      lister.publicKey,
      true
    );
    const feeCollectorTokenAccountId = await findAta(
      customPaymentMint.publicKey,
      feeCollector.publicKey,
      true
    );
    const listerPaymentMintTokenAccount = await getAccount(
      provider.connection,
      listerMintTokenAccountId
    );
    expect(listerPaymentMintTokenAccount.amount.toString()).to.eq(
      rentalPaymentAmount.sub(makerFee).toString()
    );

    const feeCollectorTokenAccount = await getAccount(
      provider.connection,
      feeCollectorTokenAccountId
    );
    expect(feeCollectorTokenAccount.amount.toString()).to.eq(
      totalFees.toString()
    );
  });
});
