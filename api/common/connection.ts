import { Connection } from "@solana/web3.js";

const networkURLs: { [key: string]: { primary: string; secondary?: string } } =
  {
    ["mainnet-beta"]: {
      primary: process.env.MAINNET_PRIMARY || "https://ssc-dao.genesysgo.net/",
      secondary: "https://ssc-dao.genesysgo.net/",
    },
    mainnet: {
      primary: process.env.MAINNET_PRIMARY || "https://ssc-dao.genesysgo.net/",
      secondary: "https://ssc-dao.genesysgo.net/",
    },
    devnet: { primary: "https://api.devnet.solana.com/" },
    testnet: { primary: "https://api.testnet.solana.com/" },
    localnet: { primary: "http://localhost:8899/" },
  };

export const connectionFor = (
  cluster: string | null,
  defaultCluster = "mainnet"
) => {
  return new Connection(
    process.env.RPC_URL || networkURLs[cluster || defaultCluster]!.primary,
    "recent"
  );
};

export const secondaryConnectionFor = (
  cluster: string | null,
  defaultCluster = "mainnet"
) => {
  return new Connection(
    process.env.RPC_URL ||
      networkURLs[cluster || defaultCluster]?.secondary ||
      networkURLs[cluster || defaultCluster]!.primary,
    "recent"
  );
};
