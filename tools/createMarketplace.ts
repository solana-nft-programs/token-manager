import * as anchor from "@project-serum/anchor";

import { tryGetAccount, withInitMarketplace } from "../src";
import { connectionFor } from "./connection";
import { executeTransaction } from "./utils";
import { SignerWallet } from "@saberhq/solana-contrib";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { getMarketplaceByName } from "../src/programs/listingAuthority/accounts";

export type MarketplaceParams = {
  name: string;
  transferAuthorityName: string;
  paymentManagerName: string;
  paymentMints?: PublicKey[];
};

const wallet = Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(anchor.utils.bytes.bs58.encode([]))
); // your wallet's secret key // your wallet's secret key

const main = async (params: MarketplaceParams, cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new Transaction();

  await withInitMarketplace(
    transaction,
    connection,
    new SignerWallet(wallet),
    params.name,
    params.transferAuthorityName,
    params.paymentManagerName
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

  const marketplaceData = await tryGetAccount(() =>
    getMarketplaceByName(connection, params.name)
  );
  if (!marketplaceData) {
    console.log("Error: Failed to create marketplace");
  } else {
    console.log(`Created marketplace ${params.name}`);
  }
};

const params: MarketplaceParams = {
  name: "cardinal",
  transferAuthorityName: "global",
  paymentManagerName: "cardinal-marketplace",
};
main(params).catch((e) => console.log(e));
