import type { CardinalProvider } from "@cardinal/common";
import {
  executeTransaction,
  getTestProvider,
  newAccountWithLamports,
  tryGetAccount,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";

import { issueToken, unissueToken } from "../../src";
import { timeInvalidator, tokenManager } from "../../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import { createProgrammableAsset } from "../utils";

describe("Programmable issue invalidate return", () => {
  let provider: CardinalProvider;
  let issuer: Wallet;
  let issuerTokenAccountId: PublicKey;
  let mintId: PublicKey;
  let rulesetId: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
    issuer = new Wallet(await newAccountWithLamports(provider.connection));
    [issuerTokenAccountId, mintId, rulesetId] = await createProgrammableAsset(
      provider.connection,
      issuer
    );
  });

  it("Issue token", async () => {
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      issuer,
      {
        mint: mintId,
        issuerTokenAccountId: issuerTokenAccountId,
        kind: TokenManagerKind.Programmable,
        rulesetId: rulesetId,
      }
    );
    await executeTransaction(provider.connection, transaction, issuer);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(mintId.toString());
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

  it("Unissue token", async () => {
    const transaction = await unissueToken(provider.connection, issuer, mintId);
    await executeTransaction(provider.connection, transaction, issuer);

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
  });
});
