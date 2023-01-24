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
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";

import { rentals, withResetExpiration } from "../../../src";
import { invalidate } from "../../../src/api";
import { timeInvalidator, tokenManager } from "../../../src/programs";
import { findTimeInvalidatorAddress } from "../../../src/programs/timeInvalidator/pda";
import {
  InvalidationType,
  TokenManagerState,
} from "../../../src/programs/tokenManager";

describe("Create, Claim and Extend, Return, Reset Expiration, Claim and Extend Again", () => {
  let provider: CardinalProvider;
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  let paymentMint: PublicKey;
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

    // create payment mint
    [recipientPaymentTokenAccountId, paymentMint] = await createMint(
      provider.connection,
      new Wallet(user),
      { target: recipient.publicKey, amount: RECIPIENT_START_PAYMENT_AMOUNT }
    );

    // create rental mint
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
        timeInvalidation: {
          durationSeconds: 0,
          maxExpiration: Date.now() / 1000 + 10000,
          extension: {
            extensionPaymentAmount: RENTAL_PAYMENT_AMONT, // Pay 10 lamport to add 1000 seconds of expiration time
            extensionDurationSeconds: 1000,
            extensionPaymentMint: paymentMint,
          },
        },
        mint: rentalMint,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
        invalidationType: InvalidationType.Reissue,
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

  it("Claim and extend rental", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const transaction = await rentals.claimRental(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );

    // After claim, extend rate rental by 1000 seconds
    const transaction2 = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      1000
    );

    transaction.instructions = [
      ...transaction.instructions,
      ...transaction2.instructions,
    ];
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

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).toEqual(
      (RECIPIENT_START_PAYMENT_AMOUNT - RENTAL_PAYMENT_AMONT).toString()
    );
  });

  it("Return Rental", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const transaction = await invalidate(
      provider.connection,
      new Wallet(recipient),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData?.parsed.state).toEqual(TokenManagerState.Issued);
  });
  it("Reset Expiration", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
    const timeInvalidatorId = findTimeInvalidatorAddress(tokenManagerId);

    const transaction = new Transaction();
    await withResetExpiration(
      transaction,
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidatorId
      )
    );

    expect(timeInvalidatorData?.parsed.expiration).toEqual(null);
  });
  it("Claim rental again", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
    const timeInvalidatorId = findTimeInvalidatorAddress(tokenManagerId);

    const transaction = await rentals.claimRental(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );

    // After claim, extend rate rental by 1000 seconds
    const transaction2 = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      1000
    );
    transaction.instructions = [
      ...transaction.instructions,
      ...transaction2.instructions,
    ];
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

    const timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidatorId
      )
    );

    // Expiration on time invalidator should be less than or equal to 1000 seconds
    expect(
      timeInvalidatorData?.parsed.expiration?.toNumber()
    ).toBeLessThanOrEqual(Date.now() / 1000 + 1000);
  });
});
