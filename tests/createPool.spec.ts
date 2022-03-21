import type * as splToken from "@solana/spl-token";
import * as web3 from "@solana/web3.js";

import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Create stake pool", () => {
  const poolIdentifier = "some-pool";
  let originalMint: splToken.Token;
  const originalMintAuthority = web3.Keypair.generate();

  before(async () => {
    const provider = getProvider();

    // original mint
    [, originalMint] = await createMint(
      provider.connection,
      originalMintAuthority,
      provider.wallet.publicKey
    );
  });

  // it("Create Pool", async () => {
  //   const provider = getProvider();
  //   const transaction = new web3.Transaction();
  //   const [] = await withCreatePool(
  //     transaction,
  //     provider.connection,
  //     provider.wallet,
  //     {
  //       identifier: new web3.PublicKey(poolIdentifier),
  //     }
  //   );
  //   const txEnvelope = new TransactionEnvelope(
  //     SolanaProvider.init({
  //       connection: provider.connection,
  //       wallet: provider.wallet,
  //       opts: provider.opts,
  //     }),
  //     [...transaction.instructions]
  //   );
  //   await expectTXTable(txEnvelope, "test", {
  //     verbosity: "error",
  //     formatLogs: true,
  //   }).to.be.fulfilled;
  //
  // const stakePoolData = await stakePool.accounts.getStakePool(
  //   provider.connection,
  //   stakePoolId
  // );
  // });
});
