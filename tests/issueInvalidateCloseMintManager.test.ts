import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
  tryGetAccount,
} from "@cardinal/common";
import { BN, Wallet } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { invalidate, issueToken } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import {
  tokenManagerProgram,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { findMintManagerId } from "../src/programs/tokenManager/pda";

describe("Issue Claim Close Mint Manager", () => {
  const recipient = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();

  beforeAll(async () => {
    const provider = await getProvider();
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
      user.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
  });

  it("Issue token", async () => {
    const provider = await getProvider();
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
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

  it("Cannot close mint manager", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const mintManagerId = findMintManagerId(rentalMint.publicKey);
    const closeMintManagerIx = await tmManagerProgram.methods
      .closeMintManager()
      .accounts({
        mintManager: mintManagerId,
        mint: rentalMint.publicKey,
        freezeAuthority: user.publicKey,
        payer: user.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();
    const transaction = new Transaction();
    transaction.add(closeMintManagerIx);

    expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(recipient)
      )
    ).to.throw();
  });

  it("Invalidate", async () => {
    await new Promise((r) => setTimeout(r, 2000));

    const provider = await getProvider();
    const transaction = await invalidate(
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerId = tokenManager.pda.tokenManagerAddressFromMint(
      rentalMint.publicKey
    );

    const tokenManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(provider.connection, tokenManagerId)
    );
    expect(tokenManagerData).to.eq(null);

    const timeInvalidatorData = await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );
    expect(timeInvalidatorData).to.eq(null);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("1");
  });

  it("Close mint manager", async () => {
    const provider = await getProvider();
    const tmManagerProgram = tokenManagerProgram(
      provider.connection,
      provider.wallet
    );

    const mintManagerId = findMintManagerId(rentalMint.publicKey);
    const closeMintManagerIx = await tmManagerProgram.methods
      .closeMintManager()
      .accounts({
        mintManager: mintManagerId,
        mint: rentalMint.publicKey,
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
        tokenManager.pda.findMintManagerId(rentalMint.publicKey)
      )
    );
    expect(checkMintManager).to.eq(null);
  });
});
