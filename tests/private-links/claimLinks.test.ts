import { Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
} from "@solana-nft-programs/common";

import {
  claimLinks,
  claimToken,
  useTransaction,
  withIssueToken,
} from "../..//src";
import { fromLink } from "../../src/claimLinks";
import { tokenManager, useInvalidator } from "../../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";

describe("Claim links", () => {
  let provider: SolanaProvider;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;
  let claimLink: string;
  let serializedUsage: string;

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

  it("Create link", async () => {
    const [transaction, tokenManagerId, otp] = await withIssueToken(
      new Transaction(),
      provider.connection,
      new Wallet(user),
      {
        mint: rentalMint,
        issuerTokenAccountId,
        useInvalidation: { totalUsages: 4 },
        kind: TokenManagerKind.Managed,
        visibility: "private",
      }
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    claimLink = claimLinks.getLink(tokenManagerId, otp);

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
      0
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      user.publicKey.toString()
    );
    expect(tokenManagerData.parsed.claimApprover?.toString()).toEqual(
      otp?.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    console.log("Link created: ", claimLink);
  });

  it("Claim from link", async () => {
    const [tokenManagerId, otpKeypair] = fromLink(claimLink);

    const transaction = await claimToken(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient),
      { signers: [otpKeypair] }
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

    const recipientTokenAccountId = await findAta(
      rentalMint,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientTokenAccountId
    );

    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);
  });

  it("Get use tx", async () => {
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint,
      1
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new Wallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use tx", async () => {
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
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

  it("Get new use tx", async () => {
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint,
      2
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new Wallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use again success", async () => {
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
    );
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);
    const useInvalidatorId =
      useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).toEqual(3);
  });
});
