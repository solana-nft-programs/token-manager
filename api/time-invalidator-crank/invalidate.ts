import {
  programs,
  tryGetAccount,
  withInvalidate,
} from "@cardinal/token-manager";
import { timeInvalidator } from "@cardinal/token-manager/dist/cjs/programs";
import { TokenManagerState } from "@cardinal/token-manager/dist/cjs/programs/tokenManager";
import { BN, utils } from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import { connectionFor, secondaryConnectionFor } from "../common/connection";

// crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.SOLANA_CRANK_KEY || "")
);

const main = async (cluster: string) => {
  const connection = connectionFor(cluster);

  const invalidTimeInvalidators =
    await programs.timeInvalidator.accounts.getAllTimeInvalidators(connection);

  console.log(
    `--------------- ${wallet.publicKey.toString()} found ${
      invalidTimeInvalidators.length
    } expired invalidators found on ${cluster} ---------------`
  );

  for (let i = 0; i < invalidTimeInvalidators.length; i++) {
    const timeInvalidatorData = invalidTimeInvalidators[i]!;
    try {
      console.log(
        `\n\n\n\n\n--------------- ${i}/${invalidTimeInvalidators.length}`,
        timeInvalidatorData.pubkey.toString(),
        timeInvalidatorData.parsed.tokenManager.toString(),
        "---------------"
      );
      const tokenManagerData = await tryGetAccount(() =>
        programs.tokenManager.accounts.getTokenManager(
          connection,
          timeInvalidatorData.parsed.tokenManager
        )
      );

      const transaction = new Transaction();
      if (!tokenManagerData) {
        transaction.add(
          timeInvalidator.instruction.close(
            connection,
            new SignerWallet(wallet),
            timeInvalidatorData.pubkey,
            timeInvalidatorData.parsed.tokenManager
          )
        );
      } else if (
        tokenManagerData?.parsed.state !== TokenManagerState.Invalidated &&
        ((timeInvalidatorData.parsed.expiration &&
          new BN(Date.now() / 1000).gte(
            timeInvalidatorData.parsed.expiration
          )) ||
          (timeInvalidatorData.parsed.maxExpiration &&
            new BN(Date.now() / 1000).gte(
              timeInvalidatorData.parsed.maxExpiration
            )) ||
          (!timeInvalidatorData.parsed.expiration &&
            timeInvalidatorData.parsed.durationSeconds &&
            tokenManagerData.parsed.state === TokenManagerState.Claimed &&
            new BN(Date.now() / 1000).gte(
              tokenManagerData.parsed.stateChangedAt.add(
                timeInvalidatorData.parsed.durationSeconds
              )
            )))
      ) {
        await withInvalidate(
          transaction,
          tokenManagerData?.parsed.receiptMint
            ? secondaryConnectionFor(cluster)
            : connection,
          new SignerWallet(wallet),
          tokenManagerData.parsed.mint
        );
      } else {
        console.log(
          `Skipping this time invalidator for mint (${tokenManagerData.parsed.mint.toString()})`
        );
      }

      if (transaction && transaction.instructions.length > 0) {
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (
          await connection.getRecentBlockhash("max")
        ).blockhash;
        transaction.sign(wallet);
        const txid = await sendAndConfirmRawTransaction(
          connection,
          transaction.serialize()
        );
        console.log(
          `Succesfully invalidated time invalidator (${timeInvalidatorData.pubkey.toBase58()}) token manager id (${
            tokenManagerData?.pubkey.toBase58() || ""
          }) with txid (${txid})`
        );
      } else {
        console.log(
          `No transaction for time invalidator (${timeInvalidatorData.pubkey.toBase58()}) token manager id (${
            tokenManagerData?.pubkey.toBase58() || ""
          }) mint (${tokenManagerData?.parsed.mint.toBase58() || ""})`
        );
      }
    } catch (e) {
      console.log(
        `Failed to invalidate time invalidator (${timeInvalidatorData.pubkey.toBase58()})`,
        e
      );
    }
  }
};

export const invalidateAll = async (mainnet = true) => {
  if (mainnet) {
    try {
      await main("mainnet");
    } catch (e) {
      console.log("Failed to invalidate on mainnet: ", e);
    }
  }

  try {
    await main("devnet");
  } catch (e) {
    console.log("Failed to invalidate on devnet: ", e);
  }
};
