import { expectTXTable } from "@saberhq/chai-solana";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

import { issueToken } from "../src";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Issue no mint manager", () => {
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
      tokenCreator.publicKey
    );
  });

  it("Issue failure", async () => {
    const provider = getProvider();
    const [transaction] = await issueToken(
      provider.connection,
      provider.wallet,
      {
        timeInvalidation: { expiration: Date.now() / 1000 },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
      }
    );
    expect(async () => {
      await expectTXTable(
        new TransactionEnvelope(SolanaProvider.init(provider), [
          ...transaction.instructions,
        ]),
        "Fail to init",
        { verbosity: "error" }
      ).to.be.rejectedWith(Error);
    });
  });
});
