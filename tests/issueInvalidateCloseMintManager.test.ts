import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  getTestProvider,
  tryGetAccount,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { BN, Wallet } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";

import { invalidate, issueToken } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import {
  tokenManagerProgram,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { findMintManagerId } from "../src/programs/tokenManager/pda";

describe("Issue Claim Close Mint Manager", () => {
  let provider: CardinalProvider;
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
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

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(user)
    );
  });

  it("Issue token", async () => {
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
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

  it("Cannot close mint manager", async () => {
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const mintManagerId = findMintManagerId(rentalMint);
    const closeMintManagerIx = await tmManagerProgram.methods
      .closeMintManager()
      .accounts({
        mintManager: mintManagerId,
        mint: rentalMint,
        freezeAuthority: user.publicKey,
        payer: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(closeMintManagerIx);

    await expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(recipient)
      )
    ).rejects.toThrow();
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const transaction = await invalidate(
      provider.connection,
      new Wallet(user),
      rentalMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).toEqual(null);

    const timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );
    expect(timeInvalidatorData).toEqual(null);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("1");
  });

  it("Close mint manager", async () => {
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const mintManagerId = findMintManagerId(rentalMint);
    const closeMintManagerIx = await tmManagerProgram.methods
      .closeMintManager()
      .accounts({
        mintManager: mintManagerId,
        mint: rentalMint,
        freezeAuthority: user.publicKey,
        payer: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(closeMintManagerIx);

    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
    const checkMintManager = await tryGetAccount(async () =>
      tokenManager.accounts.getMintManager(
        provider.connection,
        tokenManager.pda.findMintManagerId(rentalMint)
      )
    );
    expect(checkMintManager).toEqual(null);
  });
});
