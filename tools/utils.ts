import { chunkArray, logError } from "@cardinal/common";
import type { Wallet as IWallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { utils } from "@project-serum/anchor";
import type { ConfirmOptions, Connection, Transaction } from "@solana/web3.js";
import { Keypair, sendAndConfirmRawTransaction } from "@solana/web3.js";

export const keypairFrom = (s: string, n?: string): Keypair => {
  try {
    if (s.includes("[")) {
      return Keypair.fromSecretKey(
        Buffer.from(
          s
            .replace("[", "")
            .replace("]", "")
            .split(",")
            .map((c) => parseInt(c))
        )
      );
    } else {
      return Keypair.fromSecretKey(utils.bytes.bs58.decode(s));
    }
  } catch (e) {
    try {
      return Keypair.fromSecretKey(
        Buffer.from(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          JSON.parse(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-var-requires
            require("fs").readFileSync(s, {
              encoding: "utf-8",
            })
          )
        )
      );
    } catch (e) {
      process.stdout.write(`${n ?? "keypair"} is not valid keypair`);
      process.exit(1);
    }
  }
};

export async function executeTransactionBatches<T = null>(
  connection: Connection,
  txs: Transaction[],
  wallet: IWallet,
  config?: {
    signers?: Keypair[][];
    batchSize?: number;
    successHandler?: (
      txid: string,
      ix: { i: number; j: number; it: number; jt: number }
    ) => void;
    errorHandler?: (
      e: unknown,
      ix: { i: number; j: number; it: number; jt: number }
    ) => T;
    confirmOptions?: ConfirmOptions;
  }
): Promise<(string | null | T)[]> {
  const batchLength = config?.batchSize ?? txs.length;
  const batchedTxs = chunkArray(txs, batchLength);
  const txids: (string | T | null)[] = [];
  for (let i = 0; i < batchedTxs.length; i++) {
    const batch = batchedTxs[i];
    if (batch) {
      const latestBlockhash = (await connection.getLatestBlockhash()).blockhash;
      const batchSignedTxs = await wallet.signAllTransactions(
        batch.map((tx, j) => {
          tx.recentBlockhash = latestBlockhash;
          tx.feePayer = wallet.publicKey;
          if (config?.signers?.at(i * batchLength + j)) {
            tx.partialSign(...(config?.signers.at(i * batchLength + j) ?? []));
          }
          return tx;
        })
      );
      const batchTxids = await Promise.all(
        batchSignedTxs.map(async (tx, j) => {
          try {
            const txid = await sendAndConfirmRawTransaction(
              connection,
              tx.serialize(),
              config?.confirmOptions
            );
            if (config?.successHandler) {
              config?.successHandler(txid, {
                i,
                it: batchedTxs.length,
                j,
                jt: batchSignedTxs.length,
              });
            }
            return txid;
          } catch (e) {
            if (config?.errorHandler) {
              return config?.errorHandler(e, {
                i,
                it: batchedTxs.length,
                j,
                jt: batchSignedTxs.length,
              });
            }
            logError(e);
            return null;
          }
        })
      );
      txids.push(...batchTxids);
    }
  }
  return txids;
}
