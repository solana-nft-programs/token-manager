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

import { invalidate, rentals, withUpdateMaxExpiration } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import { TokenManagerState } from "../src/programs/tokenManager";

describe("Update max expiration", () => {
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  const durationSeconds = 1;
  let newMaxExpiration = new BN(0); // setting below to not set on runtime
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
        timeInvalidation: {
          durationSeconds,
        },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.expiration).to.eq(null);
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).to.eq(
      durationSeconds
    );
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

    const checkMintManager = await tokenManager.accounts.getMintManager(
      provider.connection,
      tokenManager.pda.findMintManagerId(rentalMint.publicKey)
    );
    expect(checkMintManager.parsed.tokenManagers?.toNumber()).to.eq(1);

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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).to.eq(
      durationSeconds
    );
  });

  it("Fail to update max expiration", async () => {
    const provider = await getProvider();

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    newMaxExpiration = new BN(Date.now() / 1000 + 5);
    const transaction = new Transaction();
    await withUpdateMaxExpiration(
      transaction,
      provider.connection,
      new Wallet(user),
      tokenManagerId,
      newMaxExpiration.sub(new BN(1000))
    );
    expect(
      executeTransaction(provider.connection, transaction, new Wallet(user))
    ).to.throw();
  });

  it("Update Max Expiration", async () => {
    const provider = await getProvider();

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const transaction = new Transaction();
    await withUpdateMaxExpiration(
      transaction,
      provider.connection,
      new Wallet(user),
      tokenManagerId,
      newMaxExpiration
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.maxExpiration?.toNumber()).to.eq(
      newMaxExpiration.toNumber()
    );
  });

  it("Invalidate early", async () => {
    const provider = await getProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    expect(
      executeTransaction(provider.connection, transaction, new Wallet(user))
    ).to.throw();
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 7000));

    const provider = await getProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
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
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("1");
  });
});
