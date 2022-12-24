import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
} from "@cardinal/common";
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
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

import { claimLinks, claimToken, useTransaction } from "../src";
import { fromLink } from "../src/claimLinks";
import { tokenManager, useInvalidator } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";

describe("Claim links master editions", () => {
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let editionIssuerTokenAccount: PublicKey;
  const rentalMint: Keypair = Keypair.generate();
  const editionMint: Keypair = Keypair.generate();
  let claimLink: string;
  let serializedUsage: string;

  beforeAll(async () => {
    const provider = await getProvider();
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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      tokenCreator.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      tokenCreator.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(tokenCreator)
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
    const transaction2 = new Transaction();
    const [ixs2] = await createMintIxs(
      provider.connection,
      editionMint.publicKey,
      tokenCreator.publicKey
    );
    editionIssuerTokenAccount = await findAta(
      editionMint.publicKey,
      tokenCreator.publicKey,
      true
    );
    transaction2.instructions = ixs2;
    await executeTransaction(
      provider.connection,
      transaction2,
      new Wallet(tokenCreator)
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
        editionValue: new BN(1),
      }
    );
    const tx = new Transaction();
    tx.instructions = [
      ...metadataTx.instructions,
      ...masterEditionTx.instructions,
      ...editionTx.instructions,
    ];
    await executeTransaction(provider.connection, tx, new Wallet(tokenCreator));
  });

  it("Create link", async () => {
    const provider = await getProvider();
    const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
      provider.connection,
      new Wallet(tokenCreator),
      {
        mint: rentalMint.publicKey,
        issuerTokenAccountId,
        useInvalidation: { totalUsages: 4 },
        kind: TokenManagerKind.Edition,
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(tokenCreator)
    );

    claimLink = claimLinks.getLink(tokenManagerId, otp);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      new Wallet(tokenCreator).publicKey.toString()
    );
    expect(tokenManagerData.parsed.claimApprover?.toString()).to.eq(
      otp.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    console.log("Link created: ", claimLink);
  });

  it("Claim from link", async () => {
    const provider = await getProvider();

    const [tokenManagerId, otpKeypair] = fromLink(claimLink);

    const transaction = await claimToken(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient),
      { signers: [otpKeypair] }
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    const recipientTokenAccountId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
  });

  it("Get use tx", async () => {
    const provider = await getProvider();
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey,
      1
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new Wallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use tx", async () => {
    const provider = await getProvider();
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
    const provider = await getProvider();
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey,
      2
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new Wallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use again success", async () => {
    const provider = await getProvider();
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
    const provider = await getProvider();
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

    await executeTransaction(provider.connection, transaction, provider.wallet);

    claimLink = claimLinks.getLink(tokenManagerId, otp);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      editionMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      provider.wallet.publicKey.toString()
    );
    expect(tokenManagerData.parsed.claimApprover?.toString()).to.eq(
      otp.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      editionIssuerTokenAccount
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    console.log("Link created: ", claimLink);
  });

  it("Claim edition from link", async () => {
    const provider = await getProvider();

    const [mintId, otpKeypair] = fromLink(claimLink);

    const transaction = await claimToken(
      provider.connection,
      new Wallet(recipient),
      mintId
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient),
      { signers: [otpKeypair] }
    );

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

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      editionIssuerTokenAccount
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    const recipientTokenAccountId = await findAta(
      editionMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
  });
});
