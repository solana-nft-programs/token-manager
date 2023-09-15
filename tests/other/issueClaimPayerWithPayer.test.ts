import { BN, Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
} from "@solana-nft-programs/common";

import { claimLinks, issueToken, withClaimToken } from "../../src";
import { fromLink } from "../../src/claimLinks";
import { tokenManager } from "../../src/programs";
import { TokenManagerState } from "../../src/programs/tokenManager";

describe("Issue payer invalidate", () => {
  let provider: SolanaProvider;
  const recipient = Keypair.generate();
  const payer = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;
  let claimLink: string;

  beforeAll(async () => {
    provider = await getTestProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropPayer = await provider.connection.requestAirdrop(
      payer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropPayer);

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(user)
    );
  });

  it("Issue", async () => {
    const [transaction, tokenManagerId, otp] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
        mint: rentalMint,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
        visibility: "private",
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
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

  it("Claim from link with payer", async () => {
    const [tokenManagerId, otpKeypair] = fromLink(claimLink);

    const beforeAccount = await provider.connection.getAccountInfo(
      recipient.publicKey
    );
    expect(beforeAccount).toBeNull();

    const transaction = await withClaimToken(
      new Transaction(),
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      {
        payer: payer.publicKey,
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(payer),
      { signers: [otpKeypair, recipient] }
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

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);
  });
});
