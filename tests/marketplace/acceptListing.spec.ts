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
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import {
  findAta,
  withAcceptListing,
  withCreateListing,
  withInitListingAuthority,
  withInitMarketplace,
  withWrapToken,
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

describe("Accept Listing", () => {
  const listingAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const tokenCreator = Keypair.generate();
  const buyer = Keypair.generate();
  let rentalMint: Token;
  const rentalPaymentAmount = new BN(100);
  const rentalPaymentMint = new PublicKey(
    "So11111111111111111111111111111111111111112"
  );

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);
  const BASIS_POINTS_DIVISOR = new BN(10000);

  before(async () => {
    const provider = getProvider();

    const airdropCreator = await provider.connection.requestAirdrop(
      buyer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create rental mint
    [, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
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
        wallet: new SignerWallet(tokenCreator),
        opts: provider.opts,
      }),
      [...metadataTx.instructions, ...masterEditionTx.instructions]
    );

    await expectTXTable(txEnvelope, "Create Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const pmTransaction = new Transaction();
    pmTransaction.add(
      (
        await init(provider.connection, provider.wallet, paymentManagerName, {
          feeCollector: feeCollector.publicKey,
          makerFeeBasisPoints: MAKER_FEE.toNumber(),
          takerFeeBasisPoints: TAKER_FEE.toNumber(),
        })
      )[0]
    );

    const pmTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...pmTransaction.instructions]
    );

    await expectTXTable(pmTxEnvelope, "Create Payment Manager", {
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
      listingAuthorityName
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "Create listing authority", {
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

  it("Wrap Token", async () => {
    const provider = getProvider();
    const wrapTransaction = new Transaction();

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      provider.wallet,
      rentalMint.publicKey,
      listingAuthorityName
    );

    const wrapTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...wrapTransaction.instructions]
    );

    await expectTXTable(wrapTxEnvelope, "Wrap Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
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

    expect(checkMarketplace.parsed.name).to.eq(marketplaceName);
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
    expect(checkListing.parsed.paymentAmount.toNumber()).to.eq(
      rentalPaymentAmount.toNumber()
    );
    expect(checkListing.parsed.paymentMint).to.eqAddress(rentalPaymentMint);
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

    const listerMintTokenAccountId = await findAta(
      rentalPaymentMint,
      provider.wallet.publicKey,
      true
    );
    const checkPaymentMint = new splToken.Token(
      provider.connection,
      rentalPaymentMint,
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
  });
});
