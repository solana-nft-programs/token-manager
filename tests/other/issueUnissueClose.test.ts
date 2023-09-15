import { BN, Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  getTestProvider,
  tryGetAccount,
} from "@solana-nft-programs/common";

import { rentals, unissueToken } from "../../src";
import { timeInvalidator, tokenManager } from "../../src/programs";
import { claimApproverProgram } from "../../src/programs/claimApprover";
import { findClaimApproverAddress } from "../../src/programs/claimApprover/pda";
import { timeInvalidatorProgram } from "../../src/programs/timeInvalidator";
import { findTimeInvalidatorAddress } from "../../src/programs/timeInvalidator/pda";
import { TokenManagerState } from "../../src/programs/tokenManager";

describe("Issue Unissue", () => {
  let provider: SolanaProvider;
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  const collector = Keypair.generate();
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
      new Wallet(recipient),
      { amount: RECIPIENT_START_PAYMENT_AMOUNT }
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
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint,
          collector: collector.publicKey,
        },
        timeInvalidation: {
          maxExpiration: Date.now() / 1000 + 1,
          collector: collector.publicKey,
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

  it("Unissue rental", async () => {
    const transaction = await unissueToken(
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerId = tokenManager.pda.findTokenManagerAddress(rentalMint);

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).toEqual(null);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("1");

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).toEqual(
      RECIPIENT_START_PAYMENT_AMOUNT.toString()
    );
  });

  it("Close claim approver", async () => {
    const caProgram = claimApproverProgram(
      provider.connection,
      provider.wallet
    );
    const transaction = new Transaction();

    const tokenManagerId = tokenManager.pda.findTokenManagerAddress(rentalMint);
    const claimApproverId = findClaimApproverAddress(tokenManagerId);

    const closeIx = await caProgram.methods
      .close()
      .accounts({
        tokenManager: tokenManagerId,
        claimApprover: claimApproverId,
        collector: collector.publicKey,
        closer: user.publicKey,
      })
      .instruction();
    transaction.add(closeIx);
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
  });

  it("Close time invalidator", async () => {
    const tmeInvalidatorProgram = timeInvalidatorProgram(
      provider.connection,
      provider.wallet
    );
    const transaction = new Transaction();

    const tokenManagerId = tokenManager.pda.findTokenManagerAddress(rentalMint);
    const timeInvalidatorId = findTimeInvalidatorAddress(tokenManagerId);

    const closeIx = await tmeInvalidatorProgram.methods
      .close()
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
        collector: collector.publicKey,
        closer: user.publicKey,
      })
      .instruction();
    transaction.add(closeIx);
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const timeInvalidatorData = await tryGetAccount(() =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidatorId
      )
    );
    expect(timeInvalidatorData).toEqual(null);
  });
});
