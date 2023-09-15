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
  tryGetAccount,
} from "@solana-nft-programs/common";

import { invalidate, rentals, withUpdateMaxExpiration } from "../../src";
import { timeInvalidator, tokenManager } from "../../src/programs";
import { TokenManagerState } from "../../src/programs/tokenManager";

describe("Update max expiration", () => {
  let provider: SolanaProvider;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  const durationSeconds = 3;
  let newMaxExpiration = new BN(0); // setting below to not set on runtime
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;

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

  it("Create rental", async () => {
    provider = await getTestProvider();
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: {
          durationSeconds,
        },
        mint: rentalMint,
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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.expiration).toEqual(null);
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).toEqual(
      durationSeconds
    );
  });

  it("Claim rental", async () => {
    provider = await getTestProvider();

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

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
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);

    const checkMintManager = await tokenManager.accounts.getMintManager(
      provider.connection,
      tokenManager.pda.findMintManagerId(rentalMint)
    );
    expect(checkMintManager.parsed.tokenManagers?.toNumber()).toEqual(1);

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

    const checkTimeInvalidator =
      await timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      );
    expect(checkTimeInvalidator.parsed.durationSeconds?.toNumber()).toEqual(
      durationSeconds
    );
  });

  it("Fail to update max expiration", async () => {
    provider = await getTestProvider();

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    newMaxExpiration = new BN(Date.now() / 1000 + 4);
    const transaction = new Transaction();
    await withUpdateMaxExpiration(
      transaction,
      provider.connection,
      new Wallet(user),
      tokenManagerId,
      newMaxExpiration.sub(new BN(1000))
    );
    await expect(
      executeTransaction(provider.connection, transaction, new Wallet(user))
    ).rejects.toThrow();
  });

  it("Update Max Expiration", async () => {
    provider = await getTestProvider();

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

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
    expect(checkTimeInvalidator.parsed.maxExpiration?.toNumber()).toEqual(
      newMaxExpiration.toNumber()
    );
  });

  it("Invalidate early", async () => {
    provider = await getTestProvider();

    const transaction = await invalidate(
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await expect(
      executeTransaction(provider.connection, transaction, new Wallet(user))
    ).rejects.toThrow();
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 7000));

    provider = await getTestProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).toEqual(null);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("1");
  });
});
