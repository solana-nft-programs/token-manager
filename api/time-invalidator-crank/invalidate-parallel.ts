import {
  AccountData,
  findMintMetadataId,
  getBatchedMultipleAccounts,
} from "@cardinal/common";
import { programs } from "@cardinal/token-manager";
import { timeInvalidatorProgram } from "@cardinal/token-manager/dist/cjs/programs/timeInvalidator";
import { shouldTimeInvalidate } from "@cardinal/token-manager/dist/cjs/programs/timeInvalidator/utils";
import {
  TokenManagerData,
  TokenManagerKind,
  TOKEN_MANAGER_ADDRESS,
  withRemainingAccountsForInvalidate,
} from "@cardinal/token-manager/dist/cjs/programs/tokenManager";
import {
  Metadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { utils, Wallet } from "@project-serum/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import * as dotenv from "dotenv";
dotenv.config();

import { connectionFor } from "../common/connection";

const BATCH_SIZE = 1;
const DEFAULT_MAX_CHUNKS = 100;
const MAX_PARALLEL_BATCH_LOOKUP = 2000;
const BATCH_LOOKUP_WAIT_TIME_SECONDS = 2000;

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
  console.log(
    `\n\n--------------- ${wallet.publicKey.toString()} invalidating [${cluster}] ---------------`
  );

  const connection = connectionFor(cluster);
  const tmeInvalidatorProgram = timeInvalidatorProgram(
    connection,
    new Wallet(wallet)
  );
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

  const tokenManagerIdChunks = chunkArray(
    allTimeInvalidators.map(
      (timeInvalidator) => timeInvalidator.parsed.tokenManager
    ),
    MAX_PARALLEL_BATCH_LOOKUP
  );

  console.log(`> Looking up ${allTimeInvalidators.length} token managers`);

  const tokenManagers: AccountData<TokenManagerData>[] = [];
  for (let i = 0; i < tokenManagerIdChunks.length; i++) {
    const tokenManagerIds = tokenManagerIdChunks[i];
    console.log(
      `>> [${i}/${
        tokenManagerIdChunks.length - 1
      }] batch token manager lookup [${tokenManagerIds.length}]`
    );
    const singleBatch = (
      await programs.tokenManager.accounts.getTokenManagers(
        connection,
        tokenManagerIds
      )
    ).filter((x): x is AccountData<TokenManagerData> => x.parsed !== null);
    tokenManagers.push(...singleBatch);
    await new Promise((r) => setTimeout(r, BATCH_LOOKUP_WAIT_TIME_SECONDS));
  }

  console.log(`\n> Filtering and sorting`);
  console.log(
    `>> Collecting ${tokenManagers.length} total token managers [${cluster}]`
  );
  const tokenManagersById = tokenManagers.reduce((acc, tm) => {
    acc[tm.pubkey?.toString()] = tm;
    return acc;
  }, {});
  console.log(
    `>> filtering ${allTimeInvalidators.length} total time invalidators [${cluster}]`
  );
  const filteredTimeInvalidators = allTimeInvalidators
    .filter((timeInvalidatorData) => {
      const tokenManagerData =
        tokenManagersById[timeInvalidatorData.parsed.tokenManager.toString()];
      return (
        !tokenManagerData?.parsed ||
        shouldTimeInvalidate(
          tokenManagerData,
          timeInvalidatorData,
          clock + (Date.now() / 1000 - startTime)
        )
      );
    })
    .sort(() => 0.5 - Math.random());
  console.log(
    `>> filtered to ${filteredTimeInvalidators.length} time invalidators [${cluster}]`
  );

  const chunks = chunkArray(filteredTimeInvalidators, BATCH_SIZE).slice(
    0,
    process.env.CRANK_PARALLEL_MAX_CHUNKS &&
      parseInt(process.env.CRANK_PARALLEL_MAX_CHUNKS)
      ? parseInt(process.env.CRANK_PARALLEL_MAX_CHUNKS)
      : DEFAULT_MAX_CHUNKS
  );
  console.log(`\n> Chunks`);
  console.log(
    `>> Executing chunks [${chunks
      .map((i) => i.map((j) => j.pubkey.toString()).join(","))
      .join(":")}]`
  );
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
          const tokenManagerData =
            tokenManagersById[
              timeInvalidatorData.parsed.tokenManager.toString()
            ];
          if (!tokenManagerData?.parsed) {
            const ix = await tmeInvalidatorProgram.methods
              .close()
              .accounts({
                tokenManager: timeInvalidatorData.parsed.tokenManager,
                timeInvalidator: timeInvalidatorData.pubkey,
                collector: timeInvalidatorData.parsed.collector,
                closer: wallet.publicKey,
              })
              .instruction();
            transaction.add(ix);
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
            // extra data needed
            const [metadataInfo, recipientTokenAccountInfo] =
              await getBatchedMultipleAccounts(connection, [
                findMintMetadataId(tokenManagerData.parsed.mint),
                tokenManagerData.parsed.recipientTokenAccount,
              ]);
            const metadata = metadataInfo
              ? Metadata.deserialize(metadataInfo.data)[0]
              : null;
            const recipientTokenAccount = unpackAccount(
              tokenManagerData.parsed.recipientTokenAccount,
              recipientTokenAccountInfo
            );
            const remainingAccounts = await withRemainingAccountsForInvalidate(
              transaction,
              connection,
              new Wallet(wallet),
              tokenManagerData.parsed.mint,
              tokenManagerData,
              recipientTokenAccount?.owner,
              metadata
            );
            if (tokenManagerData?.parsed.receiptMint) {
              throw "[skip] receipt mint not automated";
            }

            if (
              tokenManagerData.parsed.kind === TokenManagerKind.Programmable ||
              metadata?.tokenStandard === TokenStandard.ProgrammableNonFungible
            ) {
              transaction.add(
                ComputeBudgetProgram.setComputeUnitLimit({
                  units: 800000,
                })
              );
            }
            const invalidateIx = await tmeInvalidatorProgram.methods
              .invalidate()
              .accounts({
                tokenManager: timeInvalidatorData.parsed.tokenManager,
                timeInvalidator: timeInvalidatorData.pubkey,
                invalidator: wallet.publicKey,
                cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenManagerTokenAccount: getAssociatedTokenAddressSync(
                  tokenManagerData.parsed.mint,
                  tokenManagerData.pubkey,
                  true
                ),
                mint: tokenManagerData.parsed.mint,
                recipientTokenAccount:
                  tokenManagerData?.parsed.recipientTokenAccount,
                rent: SYSVAR_RENT_PUBKEY,
              })
              .remainingAccounts(remainingAccounts)
              .instruction();
            transaction.add(invalidateIx);

            const closeIx = await tmeInvalidatorProgram.methods
              .close()
              .accounts({
                tokenManager: timeInvalidatorData.parsed.tokenManager,
                timeInvalidator: timeInvalidatorData.pubkey,
                collector: timeInvalidatorData.parsed.collector,
                closer: wallet.publicKey,
              })
              .instruction();
            transaction.add(closeIx);
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
