import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { executeTransaction } from "@solana-nft-programs/common";

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
    new anchor.Wallet(wallet),
    transferAuthorityName,
    new PublicKey("cpmaMZyBQiPxpeuxNsQhW7N8z1o9yaNdLgiPhWGUEiX")
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

const transferAuthorityName = "temp";

main(transferAuthorityName).catch((e) => console.log(e));
