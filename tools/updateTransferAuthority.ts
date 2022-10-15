import * as anchor from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import { PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";

import { executeTransaction } from "./utils";
import { withUpdateTransferAuthority } from "../src";
import { connectionFor } from "./connection";

const wallet = Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(anchor.utils.bytes.bs58.encode([]))
); // your wallet's secret key
export type PaymentManagerParams = {
  feeCollector: PublicKey;
  authority: PublicKey;
  makerFeeBasisPoints: number;
  takerFeeBasisPoints: number;
};

const main = async (transferAuthorityName: string, cluster = "devnet") => {
  console.log(wallet.publicKey.toString());
  const connection = connectionFor(cluster);
  const transaction = new Transaction();
  await withUpdateTransferAuthority(
    transaction,
    connection,
    new SignerWallet(wallet),
    transferAuthorityName,
    new PublicKey("cpmaMZyBQiPxpeuxNsQhW7N8z1o9yaNdLgiPhWGUEiX")
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

const transferAuthorityName = "cardinal";

main(transferAuthorityName).catch((e) => console.log(e));
