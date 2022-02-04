import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";

import { claimLinks, findAta } from "../src";
import { fromLink } from "../src/claimLinks";
import { tokenManager, useInvalidator } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Claim links", () => {
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: Token;
  let claimLink: string;
  let serializedUsage: string;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
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
      tokenCreator,
      provider.wallet.publicKey,
      1,
      provider.wallet.publicKey
    );
  });

  it("Create link", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
      provider.connection,
      provider.wallet,
      {
        rentalMint: rentalMint.publicKey,
        issuerTokenAccountId,
        usages: 4,
        kind: TokenManagerKind.Unmanaged,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "always",
      formatLogs: true,
    }).to.be.fulfilled;

    claimLink = claimLinks.getLink(rentalMint.publicKey, otp);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );
    expect(tokenManagerData.parsed.claimApprover).to.eqAddress(otp.publicKey);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    console.log("Link created: ", claimLink);
  });

  it("Claim from link", async () => {
    const provider = getProvider();

    const [mintId, otpKeypair] = fromLink(claimLink);

    const transaction = await claimLinks.claimFromLink(
      provider.connection,
      new SignerWallet(recipient),
      mintId,
      otpKeypair
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions],
      [otpKeypair]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "always",
      formatLogs: true,
    }).to.be.fulfilled;

    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
      rentalMint.publicKey
    );
    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await rentalMint.getAccountInfo(
      await findAta(rentalMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
  });

  it("Get use tx", async () => {
    const provider = getProvider();
    const transaction = await claimLinks.useTransaction(
      provider.connection,
      new SignerWallet(recipient),
      rentalMint.publicKey,
      1
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new SignerWallet(recipient).signTransaction(transaction);
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
    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
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

  // it("Execute use again fail", async () => {
  //   const provider = getProvider();
  //   const buffer = Buffer.from(serializedUsage, "base64");
  //   const transaction = Transaction.from(buffer);

  //   try {
  //     const txEnvelope = new TransactionEnvelope(
  //       SolanaProvider.init({
  //         connection: provider.connection,
  //         wallet: new SignerWallet(recipient),
  //         opts: provider.opts,
  //       }),
  //       [...transaction.instructions]
  //     );
  //     await expectTXTable(txEnvelope, "test", {
  //       verbosity: "always",
  //       formatLogs: true,
  //     });
  //     assert.fail("passed");
  //   } catch (e) {
  //     console.error(e);
  //   }

  //   const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
  //     rentalMint.publicKey
  //   );
  //   const [useInvalidatorId] =
  //     await useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
  //   const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
  //     provider.connection,
  //     useInvalidatorId
  //   );
  //   expect(useInvalidatorData.parsed.usages.toNumber()).to.eq(1);
  // });

  it("Get new use tx", async () => {
    const provider = getProvider();
    const transaction = await claimLinks.useTransaction(
      provider.connection,
      new SignerWallet(recipient),
      rentalMint.publicKey,
      2
    );
    transaction.feePayer = recipient.publicKey;
    transaction.recentBlockhash = (
      await provider.connection.getRecentBlockhash("max")
    ).blockhash;
    await new SignerWallet(recipient).signTransaction(transaction);
    serializedUsage = transaction.serialize().toString("base64");
  });

  it("Execute use again success", async () => {
    const provider = getProvider();
    const buffer = Buffer.from(serializedUsage, "base64");
    const transaction = Transaction.from(buffer);
    console.log(transaction);
    await sendAndConfirmRawTransaction(
      provider.connection,
      transaction.serialize()
    );
    const [tokenManagerId] = await tokenManager.pda.findTokenManagerAddress(
      rentalMint.publicKey
    );
    const [useInvalidatorId] =
      await useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
      provider.connection,
      useInvalidatorId
    );
    expect(useInvalidatorData.parsed.usages.toNumber()).to.eq(3);
  });
});
