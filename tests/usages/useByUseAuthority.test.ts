import { BN, Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
} from "@solana-nft-programs/common";

import { issueToken, rentals, useTransaction } from "../../src";
import { tokenManager, useInvalidator } from "../../src/programs";
import { TokenManagerState } from "../../src/programs/tokenManager";

describe("Use by use authority", () => {
  let provider: SolanaProvider;
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const recipient = Keypair.generate();
  const useAuthority = Keypair.generate();
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

    const airdropUseAuthority = await provider.connection.requestAirdrop(
      useAuthority.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropUseAuthority);

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
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint,
        },
        useInvalidation: {
          useAuthority: useAuthority.publicKey,
          totalUsages: 2,
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

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );
    expect(checkRecipientPaymentTokenAccount.amount.toString()).toEqual(
      (RECIPIENT_START_PAYMENT_AMOUNT - RENTAL_PAYMENT_AMONT).toString()
    );
  });

  it("Cannot be used by holder", async () => {
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint,
      1
    );
    await expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(recipient)
      )
    ).rejects.toThrow();
  });

  it("Use by use authority", async () => {
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(useAuthority),
      rentalMint,
      1
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(useAuthority)
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
    const useInvalidatorId =
      useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).toEqual(1);
  });
});
