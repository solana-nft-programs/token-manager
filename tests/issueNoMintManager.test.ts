import { createMintIxs, executeTransaction, findAta } from "@cardinal/common";
import { Wallet } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { issueToken } from "../src";
import { getProvider } from "./workspace";

describe("Issue no mint manager", () => {
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();

  beforeAll(async () => {
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

  it("Issue failure", async () => {
    const provider = getProvider();
    const [transaction] = await issueToken(
      provider.connection,
      provider.wallet,
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
      }
    );
    expect(
      executeTransaction(
        provider.connection,
        transaction,
        new Wallet(recipient)
      )
    ).to.throw();
  });
});
