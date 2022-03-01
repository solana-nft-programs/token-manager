import { Connection } from "@solana/web3.js";

const networkURLs: { [key: string]: string } = {
  ["mainnet-beta"]: "https://ssc-dao.genesysgo.net/",
  mainnet: "https://ssc-dao.genesysgo.net/",
  devnet: "https://api.devnet.solana.com/",
  testnet: "https://api.testnet.solana.com/",
  localnet: "http://localhost:8899/",
};

export const connectionFor = (cluster: string, defaultCluster = "mainnet") => {
  return new Connection(
    process.env.RPC_URL || networkURLs[cluster || defaultCluster] || "",
    "recent"
  );
};
