import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  getTestProvider,
} from "@cardinal/common";
import { beforeAll, expect } from "@jest/globals";
import { Wallet } from "@project-serum/anchor";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { issueToken } from "../src";

describe("Issue no mint manager", () => {
  let provider: CardinalProvider;
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
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
      provider.wallet
    );
  });

  it("Issue failure", async () => {
    const [transaction] = await issueToken(
      provider.connection,
      provider.wallet,
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
        mint: rentalMint,
        issuerTokenAccountId: issuerTokenAccountId,
      }
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
