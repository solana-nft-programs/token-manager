import { tryGetAccount } from "../src";
import { connectionFor } from "./connection";
import { PublicKey } from "@solana/web3.js";
import { getMarketplaceByName } from "../src/programs/transferAuthority/accounts";

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

main("cardinal").catch((e) => console.log(e));
