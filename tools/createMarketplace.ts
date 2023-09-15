import { utils, Wallet } from "@coral-xyz/anchor";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";
import { executeTransaction, tryGetAccount } from "@solana-nft-programs/common";

import { withInitMarketplace } from "../src";
import { getMarketplaceByName } from "../src/programs/transferAuthority/accounts";
import { connectionFor } from "./connection";

export type MarketplaceParams = {
  name: string;
  transferAuthorityName: string;
  paymentManagerName: string;
  paymentMints?: PublicKey[];
};

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(utils.bytes.bs58.encode([]))
); // your wallet's secret key // your wallet's secret key

const main = async (params: MarketplaceParams, cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new Transaction();

  await withInitMarketplace(
    transaction,
    connection,
    new Wallet(wallet),
    params.name,
    params.paymentManagerName
  );

  try {
    await executeTransaction(connection, transaction, new Wallet(wallet), {});
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
  name: "marketplace-temp",
  transferAuthorityName: "global",
  paymentManagerName: "temp-marketplace",
};
main(params).catch((e) => console.log(e));
