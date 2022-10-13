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
  withInitListingAuthority,
  withRelease,
  withWrapToken,
} from "../src";
import { getListingAuthorityByName } from "../src/programs/listingAuthority/accounts";
import { findListingAuthorityAddress } from "../src/programs/listingAuthority/pda";
import { init } from "../src/programs/paymentManager/instruction";
import { getTokenManager } from "../src/programs/tokenManager/accounts";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Release wrapped token", () => {
  const listingAuthorityName = `lst-auth-${Math.random()}`;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  let tokenMint: Token;

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);

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
    [, tokenMint] = await createMint(
      provider.connection,
      lister,
      lister.publicKey,
      1,
      lister.publicKey
    );

    const metadataId = await Metadata.getPDA(tokenMint.publicKey);
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
        mint: tokenMint.publicKey,
        mintAuthority: lister.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(tokenMint.publicKey);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: lister.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: lister.publicKey,
        mint: tokenMint.publicKey,
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

    const pmTransaction = new Transaction();
    pmTransaction.add(
      (
        await init(provider.connection, provider.wallet, paymentManagerName, {
          feeCollector: feeCollector.publicKey,
          makerFeeBasisPoints: MAKER_FEE.toNumber(),
          takerFeeBasisPoints: TAKER_FEE.toNumber(),
          includeSellerFeeBasisPoints: true,
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

    const checkListingAuthority = await getListingAuthorityByName(
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
      emptyWallet(lister.publicKey),
      tokenMint.publicKey,
      listingAuthorityName
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
      tokenMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const mintTokenAccountId = await findAta(
      tokenMint.publicKey,
      lister.publicKey,
      true
    );
    const mintTokenAccount = await checkMint.getAccountInfo(mintTokenAccountId);
    expect(mintTokenAccount.amount.toNumber()).to.equal(1);
    expect(mintTokenAccount.isFrozen).to.be.true;

    const [tokenManagerId] = await findTokenManagerAddress(tokenMint.publicKey);
    const tokenManagerData = await getTokenManager(
      provider.connection,
      tokenManagerId
    );
    const [listingAuthorityId] = await findListingAuthorityAddress(
      listingAuthorityName
    );
    expect(
      tokenManagerData.parsed.invalidators
        .map((inv) => inv.toString())
        .toString()
    ).to.eq([listingAuthorityId.toString()].toString());
  });

  it("Release token", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    const [listingAuthorityId] = await findListingAuthorityAddress(
      listingAuthorityName
    );

    await withRelease(
      transaction,
      provider.connection,
      emptyWallet(lister.publicKey),
      tokenMint.publicKey,
      listingAuthorityId
    );

    const wrapTxEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [lister]
    );

    await expectTXTable(wrapTxEnvelope, "realease wrapped token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkMint = new splToken.Token(
      provider.connection,
      tokenMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const mintTokenAccountId = await findAta(
      tokenMint.publicKey,
      lister.publicKey,
      true
    );
    const mintTokenAccount = await checkMint.getAccountInfo(mintTokenAccountId);
    expect(mintTokenAccount.amount.toNumber()).to.equal(1);
    expect(mintTokenAccount.isFrozen).to.be.false;
  });
});
