import * as anchor from "@project-serum/anchor";

import { tryGetAccount, withInitTransferAuthority } from "../src";
import { connectionFor } from "./connection";
import { executeTransaction } from "./utils";
import { SignerWallet } from "@saberhq/solana-contrib";
import { Keypair, Transaction } from "@solana/web3.js";
import { getTransferAuthorityByName } from "../src/programs/listingAuthority/accounts";

const wallet = Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(anchor.utils.bytes.bs58.encode([]))
); // your wallet's secret key

const main = async (transferAuthorityName: string, cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new Transaction();

  await withInitTransferAuthority(
    transaction,
    connection,
    new SignerWallet(wallet),
    transferAuthorityName
  );

  console.log(transaction.instructions.map((ix) => ix.programId.toString()));

  try {
    await executeTransaction(
      connection,
      new SignerWallet(wallet),
      transaction,
      {
        confirmOptions: {
          skipPreflight: true,
        },
      }
    );
  } catch (e) {
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

const transferAuthorityName = "global";
main(transferAuthorityName).catch((e) => console.log(e));
