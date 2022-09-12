import * as anchor from "@project-serum/anchor";

import { getPaymentManager } from "../src/programs/paymentManager/accounts";
import { tryGetAccount, withInitListingAuthority } from "../src";
import { connectionFor } from "./connection";
import { findListingAuthorityAddress } from "../src/programs/listingAuthority/pda";
import { executeTransaction } from "./utils";
import { SignerWallet } from "@saberhq/solana-contrib";
import { Keypair, Transaction } from "@solana/web3.js";

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

  const [listingAuthorityId] = await findListingAuthorityAddress(
    listingAuthorityName
  );
  const listingAuthorityData = await tryGetAccount(() =>
    getPaymentManager(connection, listingAuthorityId)
  );
  if (!listingAuthorityData) {
    console.log("Error: Failed to create listing authority");
  } else {
    console.log(`Created listing authority ${listingAuthorityName}`);
  }
};

const listingAuthorityName = "global";
main(listingAuthorityName).catch((e) => console.log(e));
