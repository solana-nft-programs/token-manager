import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  getTestProvider,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { BN, Wallet } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

import { withReplaceInvalidator } from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  tokenManagerProgram,
} from "../../src/programs/tokenManager";
import {
  findMintCounterId,
  findTokenManagerAddress,
} from "../../src/programs/tokenManager/pda";

describe("Update Invalidators on Token Manager", () => {
  let provider: CardinalProvider;
  const invalidator = Keypair.generate();
  let mint: PublicKey;
  let issuerTokenAccountId: PublicKey;
  let tokenManagerId: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      invalidator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create rental mint
    [issuerTokenAccountId, mint] = await createMint(
      provider.connection,
      new Wallet(invalidator)
    );

    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      new Wallet(invalidator)
    );

    const transaction = new Transaction();
    tokenManagerId = findTokenManagerAddress(mint);
    const mintCounterId = findMintCounterId(mint);

    const tokenManagerInitIx = await tmManagerProgram.methods
      .init({
        amount: new BN(1),
        kind: TokenManagerKind.Managed,
        invalidationType: InvalidationType.Release,
        numInvalidators: 1,
      })
      .accounts({
        tokenManager: tokenManagerId,
        mintCounter: mintCounterId,
        mint: mint,
        issuer: invalidator.publicKey,
        payer: invalidator.publicKey,
        issuerTokenAccount: issuerTokenAccountId,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(tokenManagerInitIx);

    const addInvalidatorIx = await tmManagerProgram.methods
      .addInvalidator(invalidator.publicKey)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: invalidator.publicKey,
      })
      .instruction();
    transaction.add(addInvalidatorIx);

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(invalidator)
    );
  });

  it("Update Invalidators on Token Manager", async () => {
    const newInvalidator = Keypair.generate();

    const transaction = new Transaction();

    await withReplaceInvalidator(
      transaction,
      provider.connection,
      new Wallet(invalidator),
      tokenManagerId,
      newInvalidator.publicKey
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(invalidator)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.invalidators).toEqual([
      newInvalidator.publicKey,
    ]);
  });

  it("Fail To Update Invalidators on Token Manager because of wrong signer", async () => {
    const transaction = new Transaction();

    const otherSigner = Keypair.generate();
    const airdropCreator = await provider.connection.requestAirdrop(
      otherSigner.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    await withReplaceInvalidator(
      transaction,
      provider.connection,
      new Wallet(otherSigner),
      tokenManagerId,
      Keypair.generate().publicKey
    );
    await expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(otherSigner)
      )
    ).rejects.toThrow();
  });
});
