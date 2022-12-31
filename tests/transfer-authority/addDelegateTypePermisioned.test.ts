import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import {
  CreateMetadataV2,
  DataV2,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";

import {
  withClaimToken,
  withDelegate,
  withIssueToken,
  withUndelegate,
} from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";

describe("Add and Remove Delegate for Type Permissioned", () => {
  let provider: CardinalProvider;
  const user = Keypair.generate();
  let rentalMint: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create rental mint
    [, rentalMint] = await createMint(provider.connection, new Wallet(user));

    const metadataId = await Metadata.getPDA(rentalMint);
    const metadataTx = new CreateMetadataV2(
      { feePayer: user.publicKey },
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
        updateAuthority: user.publicKey,
        mint: rentalMint,
        mintAuthority: user.publicKey,
      }
    );
    const tx = new Transaction();
    tx.instructions = [...metadataTx.instructions];
    await executeTransaction(provider.connection, tx, new Wallet(user));
  });

  it("Issue Token Manager", async () => {
    const issuerTokenAccountId = await findAta(
      rentalMint,
      user.publicKey,
      true
    );
    const [transaction, tokenManagerId] = await withIssueToken(
      new Transaction(),
      provider.connection,
      new Wallet(user),
      {
        mint: rentalMint,
        issuerTokenAccountId,
        kind: TokenManagerKind.Permissioned,
        invalidationType: InvalidationType.Release,
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
    expect(tokenManagerData.parsed.invalidators.length).toEqual(0);
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      user.publicKey.toString()
    );
    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");
  });

  it("Fail To Delegate Token", async () => {
    const transaction = new Transaction();
    await withDelegate(
      transaction,
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await expect(
      executeTransaction(provider.connection, transaction, provider.wallet)
    ).rejects.toThrow();
  });

  it("Claim Token Manager", async () => {
    const tokenManagerId = findTokenManagerAddress(rentalMint);
    const claimerTokenAccountId = await findAta(
      rentalMint,
      user.publicKey,
      true
    );
    const transaction = await withClaimToken(
      new Transaction(),
      provider.connection,
      new Wallet(user),
      tokenManagerId
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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    const checkClaimerTokenAccount = await getAccount(
      provider.connection,
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toString()).toEqual("1");
    expect(checkClaimerTokenAccount.delegate).toBeNull();
    expect(checkClaimerTokenAccount.isFrozen).toBeTruthy();
  });

  it("Delegate Token", async () => {
    const tokenManagerId = findTokenManagerAddress(rentalMint);
    const claimerTokenAccountId = await findAta(
      rentalMint,
      user.publicKey,
      true
    );
    const transaction = new Transaction();
    await withDelegate(
      transaction,
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const checkClaimerTokenAccount = await getAccount(
      provider.connection,
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toString()).toEqual("1");
    expect(checkClaimerTokenAccount.delegate?.toString()).toEqual(
      tokenManagerId.toString()
    );
    expect(checkClaimerTokenAccount.isFrozen).toBeTruthy();
  });

  it("Undelegate Token", async () => {
    const claimerTokenAccountId = await findAta(
      rentalMint,
      user.publicKey,
      true
    );
    const transaction = new Transaction();
    await withUndelegate(
      transaction,
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const checkClaimerTokenAccount = await getAccount(
      provider.connection,
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toString()).toEqual("1");
    expect(checkClaimerTokenAccount.delegate).toBeNull();
    expect(checkClaimerTokenAccount.isFrozen).toBeTruthy();
  });
});
