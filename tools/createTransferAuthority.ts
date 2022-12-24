import { executeTransaction, tryGetAccount } from "@cardinal/common";
import * as anchor from "@project-serum/anchor";
import { Keypair, Transaction } from "@solana/web3.js";

import { withInitTransferAuthority } from "../src";
import { getTransferAuthorityByName } from "../src/programs/transferAuthority/accounts";
import { connectionFor } from "./connection";

const wallet = Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(anchor.utils.bytes.bs58.encode([]))
); // your wallet's secret key

const main = async (transferAuthorityName: string, cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new Transaction();

  await withInitTransferAuthority(
    transaction,
    connection,
    new anchor.Wallet(wallet),
    transferAuthorityName
  );

  try {
    await executeTransaction(
      connection,
      transaction,
      new anchor.Wallet(wallet)
    );
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    console.log(`Transactionn failed: ${e}`);
  }

  const transferAuthorityData = await tryGetAccount(() =>
    getTransferAuthorityByName(connection, transferAuthorityName)
  );
  if (!transferAuthorityData) {
    console.log("Error: Failed to create transfer authority");
  } else {
    console.log(`Created transfer authority ${transferAuthorityName}`);
  }
};

const transferAuthorityName = "cardinal";
main(transferAuthorityName).catch((e) => console.log(e));
