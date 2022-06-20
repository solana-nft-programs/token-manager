import { Connection } from "@solana/web3.js";

const networkURLs: { [key: string]: string } = {
  ["mainnet-beta"]:
    "https://solana-api.syndica.io/access-token/bpK4wglyeHHxd7hdEzeXCVdq8MnWQwHsqlmsCXzVYPq7jct19ouUy7ZEQzl5ZrmC/",
  mainnet:
    "https://solana-api.syndica.io/access-token/bpK4wglyeHHxd7hdEzeXCVdq8MnWQwHsqlmsCXzVYPq7jct19ouUy7ZEQzl5ZrmC/",
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
