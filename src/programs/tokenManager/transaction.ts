import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { init } from "./instruction";

export const withInit = async (
  connection: Connection,
  wallet: Wallet,
  seed: Uint8Array,
  transaction: Transaction
): Promise<[Transaction, PublicKey]> => {
  const [ix, id] = await init(connection, wallet, seed);
  return [transaction.add(ix), id];
};
