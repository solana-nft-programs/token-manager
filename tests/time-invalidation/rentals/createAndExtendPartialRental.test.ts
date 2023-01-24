import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
  tryGetAccount,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { rentals } from "../../../src";
import { timeInvalidator, tokenManager } from "../../../src/programs";
import { TokenManagerState } from "../../../src/programs/tokenManager";

describe("Create and Extend Rental", () => {
  let provider: CardinalProvider;
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const EXTENSION_PAYMENT_AMOUNT = 2;
  const EXTENSION_DURATION = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  let paymentMint: PublicKey;
  let rentalMint: PublicKey;
  let expiration: number;

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

    // create payment mint
    [recipientPaymentTokenAccountId, paymentMint] = await createMint(
      provider.connection,
      new Wallet(user),
      {
        target: recipient.publicKey,
        amount: RECIPIENT_START_PAYMENT_AMOUNT,
      }
    );

    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(user)
    );
  });

  it("Create rental", async () => {
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint,
        },
        timeInvalidation: {
          durationSeconds: EXTENSION_DURATION,
          maxExpiration: Date.now() / 1000 + 5000,
          extension: {
            extensionPaymentAmount: EXTENSION_PAYMENT_AMOUNT, // Pay 2 lamport to add 1000 seconds of expiration time
            extensionDurationSeconds: EXTENSION_DURATION,
            extensionPaymentMint: paymentMint,
          },
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

  it("Claim rental", async () => {
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

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    const recipientAta = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAta
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).toEqual(
      (RECIPIENT_START_PAYMENT_AMOUNT - RENTAL_PAYMENT_AMONT).toString()
    );
  });

  it("Extend Rental", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    let timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );
    const tokenManagerData = await tryGetAccount(async () =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expiration =
      (timeInvalidatorData?.parsed.durationSeconds?.toNumber() || 0) +
      (tokenManagerData?.parsed.stateChangedAt.toNumber() || 0);

    const transaction = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      500
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );

    expect(timeInvalidatorData?.parsed.expiration?.toNumber()).toEqual(
      expiration + EXTENSION_DURATION / 2
    );
  });

  it("Exceed Max Expiration", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const transaction = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      5000
    );
    await expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(recipient)
      )
    ).rejects.toThrow();
  });

  it("Invalid Partial Expiration", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const transaction = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      250
    );
    await expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(recipient)
      )
    ).rejects.toThrow();
  });
});
