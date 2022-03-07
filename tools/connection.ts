import { Connection } from "@solana/web3.js";

const networkURLs: { [key: string]: string } = {
  ["mainnet-beta"]:
    "https://solana-api.syndica.io/access-token/V8plLDeUb6CirggrG585VAwEMT03zJuOnJUQInf6txxozYLFYqcl0EZVyU0CnQHL/",
  mainnet:
    "https://solana-api.syndica.io/access-token/V8plLDeUb6CirggrG585VAwEMT03zJuOnJUQInf6txxozYLFYqcl0EZVyU0CnQHL/",
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
