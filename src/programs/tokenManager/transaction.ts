import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { tryGetAccount } from "../../utils";
import { getMintCounter } from "./accounts";
import { initMintCounter } from "./instruction";
import { findMintCounterId } from "./pda";

export const withInitMintCounter = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mint: PublicKey
): Promise<[BN, Transaction]> => {
  const [mintCounterId] = await findMintCounterId(mint);
  const mintCounterData = await tryGetAccount(() =>
    getMintCounter(connection, mintCounterId)
  );
  if (!mintCounterData) {
    transaction.add(await initMintCounter(connection, wallet, mint));
  }
  return [mintCounterData?.parsed.count || new BN(0), transaction];
};
