import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  Edition,
  EditionMarker,
  MasterEdition,
  Metadata,
  MintNewEditionFromMasterEditionViaToken,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

import { claimLinks, findAta, useTransaction } from "../src";
import { fromLink } from "../src/claimLinks";
import { tokenManager, useInvalidator } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Claim links master editions", () => {
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let editionIssuerTokenAccount: PublicKey;
  let rentalMint: Token;
  let editionMint: Token;
  let claimLink: string;
  let serializedUsage: string;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);

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

    // create edition mint
    [editionIssuerTokenAccount, editionMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1,
      tokenCreator.publicKey
    );

    const editionMetadataId = await Metadata.getPDA(editionMint.publicKey);

    const editionId = await Edition.getPDA(editionMint.publicKey);
    const editionMarkerId = await EditionMarker.getPDA(
      rentalMint.publicKey,
      new BN(0)
    );
    const editionTx = new MintNewEditionFromMasterEditionViaToken(
      { feePayer: tokenCreator.publicKey },
      {
        edition: editionId,
        metadata: editionMetadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: editionMint.publicKey,
        mintAuthority: tokenCreator.publicKey,
        masterEdition: masterEditionId,
        masterMetadata: metadataId,
        editionMarker: editionMarkerId,
        tokenOwner: tokenCreator.publicKey,
        tokenAccount: issuerTokenAccountId,
        editionValue: new BN(0),
      }
    );
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(tokenCreator),
        opts: provider.opts,
      }),
      [
        ...metadataTx.instructions,
        ...masterEditionTx.instructions,
        ...editionTx.instructions,
      ]
    );

    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
  });

  it("Create link", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
      provider.connection,
      new SignerWallet(tokenCreator),
      {
        mint: rentalMint.publicKey,
        issuerTokenAccountId,
        useInvalidation: { totalUsages: 4 },
        kind: TokenManagerKind.Edition,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(tokenCreator),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    claimLink = claimLinks.getLink(tokenManagerId, otp);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      new SignerWallet(tokenCreator).publicKey
    );
    expect(tokenManagerData.parsed.claimApprover).to.eqAddress(otp.publicKey);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    console.log("Link created: ", claimLink);
  });

  it("Claim from link", async () => {
    const provider = getProvider();

    const [tokenManagerId, otpKeypair] = fromLink(claimLink);

    const transaction = await claimLinks.claimFromLink(
      provider.connection,
      new SignerWallet(recipient),
      tokenManagerId,
      otpKeypair
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [otpKeypair]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await rentalMint.getAccountInfo(
      await findAta(rentalMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
  });

  it("Get use tx", async () => {
    const provider = getProvider();
    const transaction = await useTransaction(
      provider.connection,
      new SignerWallet(recipient),
      rentalMint.publicKey,
      1
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new SignerWallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use tx", async () => {
    const provider = getProvider();
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
    );
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );
    const [useInvalidatorId] =
      await useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).to.eq(1);
  });

  it("Get new use tx", async () => {
    const provider = getProvider();
    const transaction = await useTransaction(
      provider.connection,
      new SignerWallet(recipient),
      rentalMint.publicKey,
      2
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new SignerWallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use again success", async () => {
    const provider = getProvider();
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
    );
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );
    const [useInvalidatorId] =
      await useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).to.eq(3);
  });

  it("Create link for edition", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
      provider.connection,
      provider.wallet,
      {
        mint: editionMint.publicKey,
        issuerTokenAccountId: editionIssuerTokenAccount,
        useInvalidation: { totalUsages: 4 },
        kind: TokenManagerKind.Edition,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    claimLink = claimLinks.getLink(tokenManagerId, otp);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(editionMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );
    expect(tokenManagerData.parsed.claimApprover).to.eqAddress(otp.publicKey);

    const checkIssuerTokenAccount = await editionMint.getAccountInfo(
      editionIssuerTokenAccount
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    console.log("Link created: ", claimLink);
  });

  it("Claim edition from link", async () => {
    const provider = getProvider();

    const [mintId, otpKeypair] = fromLink(claimLink);

    const transaction = await claimLinks.claimFromLink(
      provider.connection,
      new SignerWallet(recipient),
      mintId,
      otpKeypair
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [otpKeypair]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      editionMint.publicKey
    );
    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await editionMint.getAccountInfo(
      editionIssuerTokenAccount
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await editionMint.getAccountInfo(
      await findAta(editionMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
  });
});
