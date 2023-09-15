import type { PublicKey } from "@solana/web3.js";
import { tryGetAccount } from "@solana-nft-programs/common";

import { getMarketplaceByName } from "../src/programs/transferAuthority/accounts";
import { connectionFor } from "./connection";

export type MarketplaceParams = {
  name: string;
  transferAuthorityName: string;
  paymentManagerName: string;
  paymentMints?: PublicKey[];
};

const main = async (name: string, cluster = "mainnet") => {
  const connection = connectionFor(cluster);
  const marketplaceData = await tryGetAccount(() =>
    getMarketplaceByName(connection, name)
  );
  if (!marketplaceData) {
    console.log("Error: Failed to find marketplace");
  } else {
    console.log(`Marketplace ${name}`);
    console.log(marketplaceData);
    console.log(marketplaceData.parsed.paymentManager.toString());
  }
};

main("temp").catch((e) => console.log(e));
