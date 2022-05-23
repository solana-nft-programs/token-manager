import { BN } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

import { invalidate, issueToken, tryGetAccount } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import { TokenManagerState } from "../src/programs/tokenManager";
import { closeMintManager } from "../src/programs/tokenManager/instruction";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Issue Claim Close Mint Manager", () => {
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: Token;

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

  it("Issue token", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      provider.wallet,
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
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
    await expectTXTable(txEnvelope, "create", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      provider.wallet.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).to.include(
      tokenManagerId.toString()
    );
  });

  it("Cannot close mint manager", async () => {
    const provider = getProvider();
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [
        (
          await closeMintManager(
            provider.connection,
            provider.wallet,
            rentalMint.publicKey
          )
        )[0],
      ]
    );
    expect(async () => {
      await expectTXTable(txEnvelope, "Fail to close", {
        verbosity: "error",
      }).to.be.rejectedWith(Error);
    });
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const provider = getProvider();
    const transaction = await invalidate(
      provider.connection,
      new SignerWallet(tokenCreator),
      rentalMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(tokenCreator),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );

    await expectTXTable(txEnvelope, "invalidate", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).to.eq(null);

    const timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        (
          await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
        )[0]
      )
    );
    expect(timeInvalidatorData).to.eq(null);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(1);
  });

  it("Close mint manager", async () => {
    const provider = getProvider();
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [
        (
          await closeMintManager(
            provider.connection,
            provider.wallet,
            rentalMint.publicKey
          )
        )[0],
      ]
    );
    await expectTXTable(txEnvelope, "invalidate", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
    const checkMintManager = await tryGetAccount(async () =>
      tokenManager.accounts.getMintManager(
        provider.connection,
        (
          await tokenManager.pda.findMintManagerId(rentalMint.publicKey)
        )[0]
      )
    );
    expect(checkMintManager).to.eq(null);
  });
});
