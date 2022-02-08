import * as splToken from "@solana/spl-token";
import type * as web3 from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

const networkURLs: { [s: string]: string } = {
  ["mainnet-beta"]: "https://ssc-dao.genesysgo.net/",
  mainnet: "https://ssc-dao.genesysgo.net/",
  devnet: "https://psytrbhymqlkfrhudd.dev.genesysgo.net:8899/",
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

/**
 * Pay and create mint and token account
 * @param connection
 * @param creator
 * @returns
 */
export const createMint = async (
  connection: web3.Connection,
  creator: web3.Keypair,
  recipient: web3.PublicKey,
  amount = 1,
  freezeAuthority: web3.PublicKey = recipient
): Promise<[web3.PublicKey, splToken.Token]> => {
  const mint = await splToken.Token.createMint(
    connection,
    creator,
    creator.publicKey,
    freezeAuthority,
    0,
    splToken.TOKEN_PROGRAM_ID
  );
  const tokenAccount = await mint.createAssociatedTokenAccount(recipient);
  await mint.mintTo(tokenAccount, creator.publicKey, [], amount);
  return [tokenAccount, mint];
};
