import { init } from "@cardinal/payment-manager/dist/cjs/instruction";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
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
import { createMint } from "../utils";
import { getProvider } from "../workspace";

describe("Restrict Payment Mints", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  let customPaymentMint: Token;
  let rentalMint: Token;
  const rentalPaymentAmount = new BN(100);

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);
  const BASIS_POINTS_DIVISOR = new BN(10000);

  before(async () => {
    const provider = getProvider();

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
    [, rentalMint] = await createMint(
      provider.connection,
      lister,
      lister.publicKey,
      1,
      lister.publicKey
    );

    // create custom payment mint
    [, customPaymentMint] = await createMint(
      provider.connection,
      buyer,
      buyer.publicKey,
      100000,
      buyer.publicKey
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
      includeSellerFeeBasisPoints: false,
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
      paymentManagerName,
      [customPaymentMint.publicKey]
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
    expect(checkMarketplace.parsed.paymentMints).to.eql([
      customPaymentMint.publicKey,
    ]);
  });

  it("Fail to Create Listing", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withCreateListing(
      transaction,
      provider.connection,
      emptyWallet(lister.publicKey),
      rentalMint.publicKey,
      marketplaceName,
      rentalPaymentAmount,
      WSOL_MINT
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
    expect(async () => {
      await expectTXTable(txEnvelope, "fail to create listing", {
        verbosity: "error",
      }).to.be.rejectedWith(Error);
    });
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
      rentalPaymentAmount,
      customPaymentMint.publicKey
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
    expect(checkListing.parsed.paymentMint).to.eqAddress(
      customPaymentMint.publicKey
    );
  });

  it("Accept Listing", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    await withAcceptListing(
      transaction,
      provider.connection,
      provider.wallet,
      buyer.publicKey,
      rentalMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [buyer]
    );
    await expectTXTable(txEnvelope, "create listing", {
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
    const checkPaymentMint = new splToken.Token(
      provider.connection,
      customPaymentMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const listerPaymentMintTokenAccount = await checkPaymentMint.getAccountInfo(
      listerMintTokenAccountId
    );
    expect(listerPaymentMintTokenAccount.amount.toNumber()).to.eq(
      rentalPaymentAmount.sub(makerFee).toNumber()
    );

    const feeCollectorTokenAccount = await checkPaymentMint.getAccountInfo(
      feeCollectorTokenAccountId
    );
    expect(feeCollectorTokenAccount.amount.toNumber()).to.eq(
      totalFees.toNumber()
    );
  });
});
