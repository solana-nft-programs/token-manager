import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
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

import { claimLinks, claimToken, useTransaction } from "../../src";
import { fromLink } from "../../src/claimLinks";
import { tokenManager, useInvalidator } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";

describe("Claim links master editions invalidate", () => {
  let provider: CardinalProvider;
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;
  let editionMint: PublicKey;
  let claimLink: string;
  let serializedUsage: string;

  beforeAll(async () => {
    provider = await getTestProvider();
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
      new Wallet(tokenCreator)
    );

    const metadataId = await Metadata.getPDA(rentalMint);
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
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(rentalMint);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: tokenCreator.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
        maxSupply: new BN(1),
      }
    );

    // create edition mint
    [, editionMint] = await createMint(
      provider.connection,
      new Wallet(tokenCreator),
      {
        target: provider.wallet.publicKey,
      }
    );

    const editionMetadataId = await Metadata.getPDA(editionMint);
    const editionId = await Edition.getPDA(editionMint);
    const editionMarkerId = await EditionMarker.getPDA(rentalMint, new BN(0));
    const editionTx = new MintNewEditionFromMasterEditionViaToken(
      { feePayer: tokenCreator.publicKey },
      {
        edition: editionId,
        metadata: editionMetadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: editionMint,
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
    const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
      provider.connection,
      new Wallet(tokenCreator),
      {
        mint: rentalMint,
        issuerTokenAccountId,
        useInvalidation: { totalUsages: 1 },
        kind: TokenManagerKind.Edition,
        invalidationType: InvalidationType.Invalidate,
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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(
      rentalMint.toString()
    );
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      0
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      new Wallet(tokenCreator).publicKey.toString()
    );
    expect(tokenManagerData.parsed.claimApprover?.toString()).toEqual(
      otp.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    console.log("Link created: ", claimLink);
  });

  it("Claim from link", async () => {
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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    const recipientAta = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAta
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);
  });

  it("Get use tx", async () => {
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint,
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
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
    );
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
    const useInvalidatorId =
      useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).toEqual(1);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(
      TokenManagerState.Invalidated
    );

    const recipientAta = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAta
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(false);
  });
});
