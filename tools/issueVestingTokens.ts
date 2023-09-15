import { utils, Wallet } from "@coral-xyz/anchor";
import type {
  AccountInfo,
  ParsedAccountData,
  Transaction,
} from "@solana/web3.js";
import {
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
} from "@solana/web3.js";
import {
  findAta,
  getBatchedMultipleAccounts,
} from "@solana-nft-programs/common";
import * as dotenv from "dotenv";

import { issueToken } from "../src";
import {
  InvalidationType,
  TokenManagerKind,
} from "../src/programs/tokenManager";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import { connectionFor } from "./connection";

dotenv.config();

const wallet = new Wallet(
  Keypair.fromSecretKey(utils.bytes.bs58.decode(process.env.AIRDROP_KEY || ""))
);

const BATCH_SIZE = 200;

const recipients = [
  {
    address: new PublicKey("..."),
    mint: new PublicKey("..."),
    releaseSeconds: 1666114200, // timestamp seconds
  },
];

export function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];
}

export const issueVestingTokens = async (cluster = "mainnet") => {
  const connection = connectionFor(cluster);
  const chunks = chunkArray(recipients, BATCH_SIZE);
  const allTxLinks = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;

    const tokenManagerIds = chunk.map(({ mint }) => {
      const tmid = findTokenManagerAddress(mint);
      return tmid;
    });
    const accounts = await getBatchedMultipleAccounts(
      connection,
      tokenManagerIds
    );
    const tokenManagersByMint = chunk.reduce((acc, c, i) => {
      return { ...acc, [c.mint.toString()]: accounts[i] };
    }, {} as { [id: string]: AccountInfo<Buffer | ParsedAccountData> | null | undefined });

    const txs = (
      await Promise.all(
        chunk.map(async (r) => {
          const issuerTokenAccountId = await findAta(
            r.mint,
            wallet.publicKey,
            false
          );
          let transaction;
          if (!tokenManagersByMint[r.mint.toString()]) {
            [transaction] = await issueToken(connection, wallet, {
              mint: r.mint,
              issuerTokenAccountId: issuerTokenAccountId,
              invalidationType: InvalidationType.Vest,
              kind: TokenManagerKind.Edition,
              visibility: "permissioned",
              permissionedClaimApprover: r.address,
              timeInvalidation: {
                maxExpiration: r.releaseSeconds,
              },
            });
          } else {
            console.log(`[skip] ${r.mint.toString()}`);
          }
          return transaction;
        })
      )
    ).filter((tx): tx is Transaction => !!tx);

    const recentBlockhash = (await connection.getRecentBlockhash("max"))
      .blockhash;
    for (const tx of txs) {
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = recentBlockhash;
    }
    await wallet.signAllTransactions(txs);
    const txLinks = await Promise.all(
      txs.map((tx) =>
        sendAndConfirmRawTransaction(connection, tx.serialize(), {
          commitment: "confirmed",
        })
          .then((txid) => {
            const link = `https://explorer.solana.com/tx/${txid}?cluster=${cluster}`;
            console.log(`[success] ${link}`);
            return link;
          })
          .catch((e) => {
            console.log(
              tx.instructions[0]?.keys.map((k) => k.pubkey.toString())
            );
            console.log("[error]", e);
            return null;
          })
      )
    );
    allTxLinks.push(...txLinks);
  }
  return allTxLinks;
};

issueVestingTokens()
  .then((txLinks) => {
    console.log(txLinks);
  })
  .catch((e) => {
    console.log(e);
  });
