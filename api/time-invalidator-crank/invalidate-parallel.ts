import {
  AccountData,
  programs,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/token-manager";
import { timeInvalidator } from "@cardinal/token-manager/dist/cjs/programs";
import { shouldTimeInvalidate } from "@cardinal/token-manager/dist/cjs/programs/timeInvalidator/utils";
import { withRemainingAccountsForReturn } from "@cardinal/token-manager/dist/cjs/programs/tokenManager";
import { utils } from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import { connectionFor, secondaryConnectionFor } from "../common/connection";

const BATCH_SIZE = 1;

// crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.SOLANA_CRANK_KEY || "")
);

export function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];
}

const tryGetSolanaClock = async (
  connection: Connection
): Promise<number | null | undefined> => {
  try {
    const epochInfo = await connection.getEpochInfo();
    const blockTimeInEpoch = await connection.getBlockTime(
      epochInfo.absoluteSlot
    );
    return blockTimeInEpoch;
  } catch (e) {
    console.log("[Error] Failed fetching solana clock: ", e);
  }
};

const main = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const startTime = Date.now() / 1000;
  let solanaClock = await tryGetSolanaClock(connection);
  if (!solanaClock) {
    console.log(
      `[Error] Failed to get solana clock falling back to local time (${startTime})`
    );
  }
  const clock = solanaClock || startTime;

  const allTimeInvalidators =
    await programs.timeInvalidator.accounts.getAllTimeInvalidators(connection);

  const tokenManagerIds = allTimeInvalidators.map(
    (timeInvalidator) => timeInvalidator.parsed.tokenManager
  );

  const tokenManagers = await programs.tokenManager.accounts.getTokenManagers(
    connection,
    tokenManagerIds
  );

  console.log(
    `\n\n--------------- ${wallet.publicKey.toString()} found ${
      allTimeInvalidators.length
    } expired invalidators found on ${cluster} ---------------`
  );

  const chunks = chunkArray(allTimeInvalidators, BATCH_SIZE);
  await Promise.all(
    chunks.map(async (chunk, chunkNum) => {
      const transaction = new Transaction();
      const transactionsData: {
        timeInvalidatorId: PublicKey;
        tokenManagerId?: PublicKey;
      }[] = [];
      for (let i = 0; i < chunk.length; i++) {
        const timeInvalidatorData = chunk[i]!;
        try {
          // console.log(
          //   `\n>> [${chunkNum}/${chunks.length}][${i / chunk.length}]`,
          //   timeInvalidatorData.pubkey.toString(),
          //   timeInvalidatorData.parsed.tokenManager.toString()
          // );
          const tokenManagerData = tokenManagers.find(
            (tokenManager) =>
              tokenManager.pubkey.toString() ===
              timeInvalidatorData.parsed.tokenManager.toString()
          );

          if (!tokenManagerData?.parsed) {
            transaction.add(
              timeInvalidator.instruction.close(
                connection,
                new SignerWallet(wallet),
                timeInvalidatorData.pubkey,
                timeInvalidatorData.parsed.tokenManager
              )
            );
            console.log(
              `[${chunkNum}/${chunks.length}][${
                i / chunk.length
              }] + (${timeInvalidatorData.pubkey.toBase58()}) no token manager`
            );
            transactionsData.push({
              timeInvalidatorId: timeInvalidatorData.pubkey,
              tokenManagerId: tokenManagerData?.pubkey,
            });
          } else if (
            shouldTimeInvalidate(
              tokenManagerData,
              timeInvalidatorData,
              clock + (Date.now() / 1000 - startTime)
            )
          ) {
            const tokenManagerTokenAccountId =
              await withFindOrInitAssociatedTokenAccount(
                transaction,
                connection,
                tokenManagerData.parsed.mint,
                tokenManagerData.pubkey,
                wallet.publicKey,
                true
              );
            const remainingAccountsForReturn =
              await withRemainingAccountsForReturn(
                transaction,
                tokenManagerData?.parsed.receiptMint
                  ? secondaryConnectionFor(cluster)
                  : connection,
                new SignerWallet(wallet),
                tokenManagerData
              );
            transaction.add(
              await timeInvalidator.instruction.invalidate(
                connection,
                new SignerWallet(wallet),
                tokenManagerData.parsed.mint,
                tokenManagerData.pubkey,
                tokenManagerData.parsed.kind,
                tokenManagerData.parsed.state,
                tokenManagerTokenAccountId,
                tokenManagerData?.parsed.recipientTokenAccount,
                remainingAccountsForReturn
              )
            );
            transaction.add(
              timeInvalidator.instruction.close(
                connection,
                new SignerWallet(wallet),
                timeInvalidatorData.pubkey,
                timeInvalidatorData.parsed.tokenManager,
                timeInvalidatorData.parsed.collector
              )
            );
            console.log(
              `[${chunkNum}/${chunks.length}][${
                i / chunk.length
              }] + (${timeInvalidatorData.pubkey.toBase58()}) token manager id (${
                tokenManagerData?.pubkey.toBase58() || ""
              }) mint (${tokenManagerData?.parsed.mint.toBase58() || ""})`
            );
            transactionsData.push({
              timeInvalidatorId: timeInvalidatorData.pubkey,
              tokenManagerId: tokenManagerData?.pubkey,
            });
          } else {
            // console.log(
            //   `- (${timeInvalidatorData.pubkey.toBase58()}) token manager id (${
            //     tokenManagerData?.pubkey.toBase58() || ""
            //   }) mint (${tokenManagerData?.parsed.mint.toBase58() || ""})`
            // );
          }
        } catch (e) {
          console.log(
            `[${chunkNum}/${chunks.length}][${
              i / chunk.length
            }] e (${timeInvalidatorData.pubkey.toBase58()})`,
            e
          );
        }
      }
      try {
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
            `[${chunkNum}/${chunks.length}] Success (${transactionsData
              .map(
                ({ timeInvalidatorId, tokenManagerId }) =>
                  `[${timeInvalidatorId.toString()}, ${tokenManagerId?.toString()}]`
              )
              .join(",")}) with txid (https://explorer.solana.com/tx/${txid})`
          );
        } else {
          // console.log(`[${chunkNum}/${chunks.length}] No instructions found`);
        }
      } catch (e) {
        console.log(
          `[${chunkNum}/${
            chunks.length
          }] Failed to invalidate (${transactionsData
            .map(
              ({ timeInvalidatorId, tokenManagerId }) =>
                `[${timeInvalidatorId.toString()},${tokenManagerId?.toString()}]`
            )
            .join(",")}): `,
          e
        );
      }
    })
  );
};

export const invalidateAllParallel = async (mainnet = true) => {
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
