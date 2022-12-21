import {
  createMintIxs,
  executeTransaction,
  findAta,
  tryGetAccount,
} from "@cardinal/common";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { rentals, unissueToken } from "../src";
import { claimApprover, timeInvalidator, tokenManager } from "../src/programs";
import { findClaimApproverAddress } from "../src/programs/claimApprover/pda";
import { findTimeInvalidatorAddress } from "../src/programs/timeInvalidator/pda";
import { TokenManagerState } from "../src/programs/tokenManager";
import { getProvider } from "./workspace";

describe("Issue Unissue", () => {
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  const collector = Keypair.generate();
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  const paymentMint: Keypair = Keypair.generate();
  const rentalMint: Keypair = Keypair.generate();

  before(async () => {
    const provider = getProvider();
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
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      paymentMint.publicKey,
      recipient.publicKey,
      { amount: RECIPIENT_START_PAYMENT_AMOUNT }
    );
    recipientPaymentTokenAccountId = await findAta(
      paymentMint.publicKey,
      recipient.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    // create rental mint
    const transaction2 = new Transaction();
    const [ixs2] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      user.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    transaction2.instructions = ixs2;
    await executeTransaction(
      provider.connection,
      transaction2,
      new Wallet(user)
    );
  });

  it("Create rental", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint.publicKey,
          collector: collector.publicKey,
        },
        timeInvalidation: {
          maxExpiration: Date.now() / 1000 + 1,
          collector: collector.publicKey,
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

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      user.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).to.include(
      tokenManagerId.toString()
    );
  });

  it("Unissue rental", async () => {
    const provider = getProvider();

    const transaction = await unissueToken(
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
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

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).to.eq(
      RECIPIENT_START_PAYMENT_AMOUNT.toString()
    );
  });

  it("Close claim approver", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
      rentalMint.publicKey
    );
    const [claimApproverId] = await findClaimApproverAddress(tokenManagerId);

    transaction.add(
      claimApprover.instruction.close(
        provider.connection,
        new Wallet(user),
        claimApproverId,
        tokenManagerId,
        collector.publicKey
      )
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
  });

  it("Close time invalidator", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
      rentalMint.publicKey
    );
    const [timeInvalidatorId] = await findTimeInvalidatorAddress(
      tokenManagerId
    );

    transaction.add(
      timeInvalidator.instruction.close(
        provider.connection,
        new Wallet(user),
        timeInvalidatorId,
        tokenManagerId,
        collector.publicKey
      )
    );
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
    expect(timeInvalidatorData).to.eq(null);
  });
});
