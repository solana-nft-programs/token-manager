import { BN, Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  createMintNewEditionFromMasterEditionViaTokenInstruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
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

import { claimLinks, claimToken, useTransaction } from "../../src";
import { fromLink } from "../../src/claimLinks";
import { tokenManager, useInvalidator } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import { findEditionMarkerId } from "../utils";

describe("Claim links master editions invalidate", () => {
  let provider: SolanaProvider;
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

    const metadataId = findMintMetadataId(rentalMint);
    const metadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
        payer: tokenCreator.publicKey,
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

    const masterEditionId = findMintEditionId(rentalMint);
    const masterEditionIx = createCreateMasterEditionV3Instruction(
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
        payer: tokenCreator.publicKey,
      },
      {
        createMasterEditionArgs: {
          maxSupply: new BN(1),
        },
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

    const editionMetadataId = findMintMetadataId(editionMint);
    const editionId = findMintEditionId(editionMint);
    const editionMarkerId = findEditionMarkerId(rentalMint, new BN(0));
    const editionIx = createMintNewEditionFromMasterEditionViaTokenInstruction(
      {
        metadata: metadataId,
        masterEdition: masterEditionId,
        payer: tokenCreator.publicKey,
        newMetadata: editionMetadataId,
        newEdition: editionId,
        newMint: editionMint,
        editionMarkPda: editionMarkerId,
        newMintAuthority: tokenCreator.publicKey,
        tokenAccountOwner: tokenCreator.publicKey,
        tokenAccount: issuerTokenAccountId,
        newMetadataUpdateAuthority: tokenCreator.publicKey,
      },
      {
        mintNewEditionFromMasterEditionViaTokenArgs: {
          edition: new BN(1),
        },
      }
    );
    const tx = new Transaction();
    tx.instructions = [metadataIx, masterEditionIx, editionIx];
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
