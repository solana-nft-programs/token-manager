import { executeTransaction } from "@cardinal/common";
import * as anchor from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import * as web3Js from "@solana/web3.js";

import { withRemoveListing } from "../src";
import { connectionFor } from "./connection";

const wallet = web3Js.Keypair.fromSecretKey(anchor.utils.bytes.bs58.decode("")); // your wallet's secret key // your wallet's secret key
export type PaymentManagerParams = {
  feeCollector: PublicKey;
  authority: PublicKey;
  makerFeeBasisPoints: number;
  takerFeeBasisPoints: number;
};

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new web3Js.Transaction();
  await withRemoveListing(
    transaction,
    connection,
    new anchor.Wallet(wallet),
    new PublicKey("HWzZz7dXETthwGxNg6JPdF6qy22SboVzaoHtLa5MZ6vq"),
    new PublicKey("HWzZz7dXETthwGxNg6JPdF6qy22SboVzaoHtLa5MZ6vq")
  );
  try {
    await executeTransaction(
      connection,
      transaction,
      new anchor.Wallet(wallet),
      {}
    );
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`Transactionn failed: ${e}`);
  }
};

main().catch((e) => console.log(e));
