import { Connection } from "@solana/web3.js";
import * as dotenv from "dotenv";

dotenv.config();

const networkURLs: { [key: string]: string } = {
  ["mainnet-beta"]:
    process.env.MAINNET_PRIMARY ||
    "https://explorer-api.mainnet-beta.solana.com/",
  mainnet:
    process.env.MAINNET_PRIMARY ||
    "https://explorer-api.mainnet-beta.solana.com/",
  devnet: "https://api.devnet.solana.com/",
  testnet: "https://api.testnet.solana.com/",
  localnet: "http://localhost:8899/",
};

export const connectionFor = (
  cluster: string | null,
  defaultCluster = "mainnet"
) => {
  return new Connection(
    process.env.RPC_URL || (networkURLs[cluster || defaultCluster] as string),
    "recent"
  );
};
