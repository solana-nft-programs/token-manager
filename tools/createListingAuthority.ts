import * as anchor from "@project-serum/anchor";

import { tryGetAccount, withInitListingAuthority } from "../src";
import { connectionFor } from "./connection";
import { executeTransaction } from "./utils";
import { SignerWallet } from "@saberhq/solana-contrib";
import { Keypair, Transaction } from "@solana/web3.js";
import { getListingAuthorityByName } from "../src/programs/listingAuthority/accounts";

const wallet = Keypair.fromSecretKey(anchor.utils.bytes.bs58.decode("")); // your wallet's secret key

const main = async (listingAuthorityName: string, cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new Transaction();

  await withInitListingAuthority(
    transaction,
    connection,
    new SignerWallet(wallet),
    listingAuthorityName
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

  const listingAuthorityData = await tryGetAccount(() =>
    getListingAuthorityByName(connection, listingAuthorityName)
  );
  if (!listingAuthorityData) {
    console.log("Error: Failed to create listing authority");
  } else {
    console.log(`Created listing authority ${listingAuthorityName}`);
  }
};

const listingAuthorityName = "global";
main(listingAuthorityName).catch((e) => console.log(e));
