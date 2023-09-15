import { Wallet } from "@coral-xyz/anchor";
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

import { claimToken, issueToken } from "../../../src";
import { tokenManager } from "../../../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../../../src/programs/tokenManager";
import { findTokenManagerAddress } from "../../../src/programs/tokenManager/pda";

describe("Permissioned rental", () => {
  let provider: SolanaProvider;
  const recipient = Keypair.generate();
  const alternativeRecipient = Keypair.generate();
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

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(user)
    );
  });

  it("Requires permissioned publicKey", async () => {
    await issueToken(provider.connection, new Wallet(user), {
      mint: rentalMint,
      issuerTokenAccountId,
      useInvalidation: { totalUsages: 4 },
      kind: TokenManagerKind.Managed,
      visibility: "permissioned",
    })
      .then(() => {
        throw "Invalid success";
      })
      .catch((e) => {
        expect(e).not.toEqual("Invalid success");
      });
  });

  it("Issue token", async () => {
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        mint: rentalMint,
        issuerTokenAccountId,
        useInvalidation: { totalUsages: 4 },
        kind: TokenManagerKind.Managed,
        visibility: "permissioned",
        permissionedClaimApprover: recipient.publicKey,
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
      0
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      user.publicKey.toString()
    );
    expect(tokenManagerData.parsed.claimApprover?.toString()).toEqual(
      recipient.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    console.log("Link created: ", claimLink);
  });

  it("Cannot be claimed by incorrect address", async () => {
    const tokenManagerId = findTokenManagerAddress(rentalMint);

    const ix = await claimToken(
      provider.connection,
      new Wallet(alternativeRecipient),
      tokenManagerId
    );
    const transaction = new Transaction();
    transaction.add(ix);
    await expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(alternativeRecipient)
      )
    ).rejects.toThrow();
  });

  it("Claim token", async () => {
    const tokenManagerId = findTokenManagerAddress(rentalMint);

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
