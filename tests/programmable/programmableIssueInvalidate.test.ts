import type { CardinalProvider } from "@cardinal/common";
import {
  executeTransaction,
  getTestProvider,
  newAccountWithLamports,
  tryGetAccount,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { Wallet } from "@project-serum/anchor";
import { getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { Keypair, PublicKey } from "@solana/web3.js";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { claimToken, invalidate, issueToken } from "../../src";
import { timeInvalidator, tokenManager } from "../../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import { createProgrammableAsset } from "../utils";

describe("Programmable issue invalidate", () => {
  let provider: CardinalProvider;
  let recipient: Keypair;
  let issuer: Keypair;
  let invalidator: Keypair;
  let issuerTokenAccountId: PublicKey;
  let mintId: PublicKey;
  let rulesetId: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
    recipient = await newAccountWithLamports(provider.connection);
    issuer = await newAccountWithLamports(provider.connection);
    invalidator = await newAccountWithLamports(provider.connection);
    const airdropCreator = await provider.connection.requestAirdrop(
      issuer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);
    [issuerTokenAccountId, mintId, rulesetId] = await createProgrammableAsset(
      provider.connection,
      new Wallet(issuer)
    );
  });

  it("Issue token", async () => {
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(issuer),
      {
        mint: mintId,
        issuerTokenAccountId: issuerTokenAccountId,
        kind: TokenManagerKind.Programmable,
        rulesetId: rulesetId,
        customInvalidators: [invalidator.publicKey],
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(issuer)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(mintId.toString());
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      1
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      issuer.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      issuer.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).toContain(
      tokenManagerId.toString()
    );
  });

  it("Claim token", async () => {
    const tokenManagerId = findTokenManagerAddress(mintId);
    const transaction = await claimToken(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(mintId.toString());
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      1
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      issuer.publicKey.toString()
    );

    const recipientTokenAccountId = getAssociatedTokenAddressSync(
      mintId,
      recipient.publicKey
    );
    const receipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(receipientTokenAccount.amount.toString()).toEqual("1");
  });

  it("Invalidate", async () => {
    const transaction = await invalidate(
      provider.connection,
      new Wallet(invalidator),
      mintId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(invalidator)
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(mintId);
    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).toEqual(null);

    const timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );
    expect(timeInvalidatorData).toEqual(null);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("1");

    const recipientTokenAccountId = getAssociatedTokenAddressSync(
      mintId,
      recipient.publicKey
    );
    const receipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );
    expect(receipientTokenAccount.amount.toString()).toEqual("0");
  });
});
