import { Connection } from "@solana/web3.js";

const networkURLs: { [s: string]: string } = {
  ["mainnet-beta"]: "https://ssc-dao.genesysgo.net/",
  mainnet: "https://ssc-dao.genesysgo.net/",
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
