import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
} from "@cardinal/common";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { claimToken, issueToken } from "../src";
import { tokenManager } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";

describe("Permissioned rental", () => {
  const recipient = Keypair.generate();
  const alternativeRecipient = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();
  let claimLink: string;

  beforeAll(async () => {
    const provider = await getProvider();
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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      provider.wallet.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      provider.wallet.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(provider.connection, transaction, provider.wallet);
  });

  it("Requires permissioned publicKey", async () => {
    const provider = await getProvider();
    await issueToken(provider.connection, new Wallet(user), {
      mint: rentalMint.publicKey,
      issuerTokenAccountId,
      useInvalidation: { totalUsages: 4 },
      kind: TokenManagerKind.Managed,
      visibility: "permissioned",
    })
      .then(() => {
        throw "Invalid success";
      })
      .catch((e) => {
        expect(e).to.not.eq("Invalid success");
      });
  });

  it("Issue token", async () => {
    const provider = await getProvider();
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        mint: rentalMint.publicKey,
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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );
    expect(tokenManagerData.parsed.claimApprover?.toString()).to.eq(
      recipient.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    console.log("Link created: ", claimLink);
  });

  it("Cannot be claimed by incorrect address", async () => {
    const provider = await getProvider();
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );

    const ix = await claimToken(
      provider.connection,
      new Wallet(alternativeRecipient),
      tokenManagerId
    );
    const transaction = new Transaction();
    transaction.add(ix);
    expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(alternativeRecipient)
      )
    ).to.throw();
  });

  it("Claim token", async () => {
    const provider = await getProvider();
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );

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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    const recipientAtaId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);
  });
});
