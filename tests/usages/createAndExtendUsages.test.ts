import { Wallet } from "@coral-xyz/anchor";
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
  tryGetAccount,
} from "@solana-nft-programs/common";

import { extendUsages, rentals } from "../../src";
import { tokenManager, useInvalidator } from "../../src/programs";
import { TokenManagerState } from "../../src/programs/tokenManager";

describe("Create and Extend Rental", () => {
  let provider: SolanaProvider;
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000;
  const RENTAL_PAYMENT_AMONT = 10;
  const TOTAL_USAGES = 1;
  const EXTENSION_USAGES = 1;
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
        },
        useInvalidation: {
          totalUsages: TOTAL_USAGES,
          extension: {
            extensionPaymentAmount: 1, // Pay 1 lamport to add 1 usage
            extensionUsages: EXTENSION_USAGES,
            extensionPaymentMint: paymentMint,
            maxUsages: 4,
          },
        },
        mint: rentalMint,
        issuerTokenAccountId: issuerTokenAccountId,
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

  it("Extend", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    let useInvalidatorData = await tryGetAccount(async () =>
      useInvalidator.accounts.getUseInvalidator(
        provider.connection,
        useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId)
      )
    );
    const totalUsages = useInvalidatorData?.parsed.totalUsages?.toNumber() || 0;
    expect(totalUsages).toEqual(TOTAL_USAGES);

    const transaction = await extendUsages(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      1
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    useInvalidatorData = await tryGetAccount(async () =>
      useInvalidator.accounts.getUseInvalidator(
        provider.connection,
        useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId)
      )
    );

    expect(useInvalidatorData?.parsed.totalUsages?.toNumber()).toEqual(
      TOTAL_USAGES + EXTENSION_USAGES
    );
  });
  it("Exceed Max Usages", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const transaction = await extendUsages(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      4
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
