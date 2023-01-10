import { chunkArray, executeTransaction } from "@cardinal/common";
import { utils, Wallet } from "@project-serum/anchor";
import type { PublicKey, TokenAccountBalancePair } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";
import * as dotenv from "dotenv";

import { withMigrate } from "../../src";
import { connectionFor } from "../connection";
import { spheres } from "./hyperspheres";

dotenv.config();

const RULESET_NAME = "";
const BATCH_SIZE = 2;
const PARALLET_BATCH_SIZE = 50;

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(utils.bytes.bs58.encode([]))
); // your wallet's secret key // your wallet's secret key

const main = async (mints: PublicKey[], cluster = "devnet") => {
  const connection = connectionFor(cluster);

  const chunkedMintIds = chunkArray(mints, BATCH_SIZE);
  const batchedChunks = chunkArray(chunkedMintIds, PARALLET_BATCH_SIZE);
  for (let i = 0; i < batchedChunks.length; i++) {
    const chunk = batchedChunks[i]!;
    console.log(`${i + 1}/${batchedChunks.length}`);
    await Promise.all(
      chunk.map(async (mintIds, c) => {
        const transaction = new Transaction();
        const tokenAccounts = (
          await Promise.all(
            mintIds.map((mintId) => connection.getTokenLargestAccounts(mintId))
          )
        ).map(
          (res) =>
            res.value.find((tks) => tks.uiAmount && tks.uiAmount > 0) || null
        );
        const mintsToMigrate = mintIds.reduce(
          (acc, mintId, index) => {
            if (tokenAccounts[index] === null) {
              return acc;
            }
            return [
              ...acc,
              { mintId: mintId, tokenAccount: tokenAccounts[index]! },
            ];
          },
          [] as {
            mintId: PublicKey;
            tokenAccount: TokenAccountBalancePair;
          }[]
        );
        for (let j = 0; j < mintsToMigrate.length; j++) {
          const mint = mintsToMigrate[j]!;
          console.log(
            `>>[${c + 1}/${chunk.length}][${j + 1}/${
              mintsToMigrate.length
            }] (${mint.mintId.toString()})`
          );
          await withMigrate(
            transaction,
            connection,
            new Wallet(wallet),
            mint.mintId,
            RULESET_NAME,
            mint.tokenAccount.address,
            wallet.publicKey
          );
        }
        const txid = await executeTransaction(
          connection,
          transaction,
          new Wallet(wallet)
        );
        console.log(
          `[success] ${mintsToMigrate
            .map((e) => e.mintId.toString())
            .join()} (https://explorer.solana.com/tx/${txid})`
        );
      })
    );
  }
};

main(spheres, "mainnet-beta").catch((e) => console.log(e));
