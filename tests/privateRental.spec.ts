import { createMintIxs, executeTransaction, findAta } from "@cardinal/common";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

import { claimLinks, claimToken, rentals, useTransaction } from "../src";
import { fromLink } from "../src/claimLinks";
import { tokenManager, useInvalidator } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { getProvider } from "./workspace";

describe("Private rental", () => {
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();
  let claimLink: string;
  let serializedUsage: string;

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

    // create rental mint
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      provider.wallet.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      provider.wallet.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(provider.connection, transaction, provider.wallet);
  });

  it("Create link", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId, otp] = await rentals.createRental(
      provider.connection,
      new Wallet(user),
      {
        mint: rentalMint.publicKey,
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
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(tokenManagerData.parsed.claimApprover?.toString()).to.eq(
      otp!.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    console.log("Link created: ", claimLink);
  });

  it("Claim from link", async () => {
    const provider = getProvider();

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

  it("Get use tx", async () => {
    const provider = getProvider();
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey,
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
    const provider = getProvider();
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
    );
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );
    const [useInvalidatorId] =
      await useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).to.eq(1);
  });

  it("Get new use tx", async () => {
    const provider = getProvider();
    const transaction = await useTransaction(
      provider.connection,
      new Wallet(recipient),
      rentalMint.publicKey,
      2
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new Wallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });
});
