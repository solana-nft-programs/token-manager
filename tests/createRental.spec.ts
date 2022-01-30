import { expectTXTable } from "@saberhq/chai-solana";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { createRental } from "../src";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Rentals", () => {
  it("Create rental", async () => {
    const provider = getProvider();

    const tokenCreator = Keypair.generate();
    const fromAirdropSignature = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(fromAirdropSignature);

    const [_, paymentMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1000
    );

    const transaction = await createRental(
      provider.connection,
      provider.wallet,
      {
        paymentAmount: 10,
        paymentMint: paymentMint.publicKey,
        expiration: Date.now() / 1000,
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
    await expectTXTable(txEnvelope).to.be.fulfilled;
  });
});
