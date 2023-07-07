import type { CardinalProvider } from "@cardinal/common";
import {
  createMintTx,
  executeTransaction,
  findMintEditionId,
  findMintMetadataId,
  getTestProvider,
  METADATA_PROGRAM_ID,
  tryGetAccount,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { createCreateMetadataAccountV3Instruction } from "@metaplex-foundation/mpl-token-metadata";
import { BN, Wallet } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import { claimToken, issueToken } from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  tokenManagerProgram,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import {
  getMintManager,
  getTokenManager,
} from "../../src/programs/tokenManager/accounts";
import {
  findMintManagerId,
  findTokenManagerAddress,
} from "../../src/programs/tokenManager/pda";

describe("Permissioned migrate", () => {
  let provider: CardinalProvider;
  const recipient = Keypair.generate();
  const invalidator = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropInvalidator = await provider.connection.requestAirdrop(
      invalidator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropInvalidator);

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);

    // create rental mint
    const mintKeypair = Keypair.generate();
    const mintId = mintKeypair.publicKey;
    const [tx, ata] = await createMintTx(
      provider.connection,
      mintKeypair.publicKey,
      user.publicKey
    );
    tx.add(
      createCreateMetadataAccountV3Instruction(
        {
          metadata: findMintMetadataId(mintId),
          mint: mintId,
          mintAuthority: user.publicKey,
          payer: user.publicKey,
          updateAuthority: invalidator.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: "",
              symbol: "",
              uri: "",
              sellerFeeBasisPoints: 0,
              creators: [
                { address: invalidator.publicKey, share: 100, verified: false },
              ],
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      )
    );
    await executeTransaction(provider.connection, tx, new Wallet(user), {
      signers: [mintKeypair],
    });
    issuerTokenAccountId = ata;
    rentalMint = mintId;
  });

  it("Issue token", async () => {
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
        mint: rentalMint,
        kind: TokenManagerKind.Permissioned,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
        invalidationType: InvalidationType.Release,
        customInvalidators: [invalidator.publicKey],
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

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
      1
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      user.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      user.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).toContain(
      tokenManagerId.toString()
    );
  });

  it("Claim token", async () => {
    const transaction = await claimToken(
      provider.connection,
      new Wallet(user),
      findTokenManagerAddress(rentalMint)
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      findTokenManagerAddress(rentalMint)
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(
      rentalMint.toString()
    );
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("Migrate", async () => {
    const tokenManager = await getTokenManager(
      provider.connection,
      findTokenManagerAddress(rentalMint)
    );
    const mintManagerId = findMintManagerId(rentalMint);
    const ix = await tokenManagerProgram(provider.connection, provider.wallet)
      .methods.migrate()
      .accountsStrict({
        mintManager: mintManagerId,
        tokenManager: findTokenManagerAddress(rentalMint),
        tokenManagerTokenAccount: getAssociatedTokenAddressSync(
          rentalMint,
          findTokenManagerAddress(rentalMint),
          true
        ),
        mint: rentalMint,
        mintMetadata: findMintMetadataId(rentalMint),
        mintEdition: findMintEditionId(rentalMint),
        holderTokenAccount: tokenManager.parsed.recipientTokenAccount,
        invalidator: invalidator.publicKey,
        payer: invalidator.publicKey,
        collector: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        mplTokenMetadata: METADATA_PROGRAM_ID,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(ix);

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(invalidator)
    );
    const checkMintManager = await tryGetAccount(async () =>
      getMintManager(provider.connection, findMintManagerId(rentalMint))
    );
    expect(checkMintManager).toEqual(null);

    const checkTokenManager = await tryGetAccount(async () =>
      getTokenManager(provider.connection, findTokenManagerAddress(rentalMint))
    );
    expect(checkTokenManager).toEqual(null);

    const editionInfo = await provider.connection.getAccountInfo(
      findMintEditionId(rentalMint)
    );
    expect(editionInfo?.data.length).toBeGreaterThan(0);
  });
});
