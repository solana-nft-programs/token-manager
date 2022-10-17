import * as anchor from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import { PublicKey } from "@solana/web3.js";
import * as web3Js from "@solana/web3.js";

import { executeTransaction } from "./utils";
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
    new SignerWallet(wallet),
    new PublicKey("HWzZz7dXETthwGxNg6JPdF6qy22SboVzaoHtLa5MZ6vq"),
    new PublicKey("HWzZz7dXETthwGxNg6JPdF6qy22SboVzaoHtLa5MZ6vq")
  );
  try {
    await executeTransaction(
      connection,
      new SignerWallet(wallet),
      transaction,
      {}
    );
  } catch (e) {
    console.log(`Transactionn failed: ${e}`);
  }
};

main().catch((e) => console.log(e));
