import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
  tryGetAccount,
} from "@cardinal/common";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { invalidate, rentals } from "../src";
import { tokenManager } from "../src/programs";
import {
  InvalidationType,
  TokenManagerState,
} from "../src/programs/tokenManager";

describe("Time invalidation release", () => {
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();

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
      user.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
  });

  it("Create rental", async () => {
    const provider = await getProvider();
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 + 1 },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");
  });

  it("Claim rental", async () => {
    const provider = await getProvider();

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const transaction = await rentals.claimRental(
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

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const provider = await getProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).to.eq(null);

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
    expect(checkRecipientTokenAccount.isFrozen).to.eq(false);
    expect(checkRecipientTokenAccount.delegatedAmount.toString()).to.eq("0");
    expect(checkRecipientTokenAccount.delegate).to.eq(null);
  });
});
