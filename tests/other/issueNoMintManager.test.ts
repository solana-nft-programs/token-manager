import { Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  getTestProvider,
} from "@solana-nft-programs/common";

import { issueToken } from "../../src";

describe("Issue no mint manager", () => {
  let provider: SolanaProvider;
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
