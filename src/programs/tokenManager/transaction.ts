import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";

import { tryGetAccount } from "../../utils";
import { getMintCounter, getReceiptMintManager } from "./accounts";
import { initMintCounter, initReceiptMintManager } from "./instruction";
import { findMintCounterId, findReceiptMintManagerId } from "./pda";

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

export const withInitReceiptMintManager = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet
): Promise<Transaction> => {
  const [receiptMintManagerId] = await findReceiptMintManagerId();
  const receiptMintManagerData = await tryGetAccount(() =>
    getReceiptMintManager(connection, receiptMintManagerId)
  );
  if (!receiptMintManagerData) {
    const [initReceiptMintManagerIx] = await initReceiptMintManager(
      connection,
      wallet
    );
    transaction.add(initReceiptMintManagerIx);
  }
  return transaction;
};
