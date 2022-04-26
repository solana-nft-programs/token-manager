/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Wallet } from "@saberhq/solana-contrib";
import * as splToken from "@solana/spl-token";
import { Connection } from "@solana/web3.js";
import * as web3 from "@solana/web3.js";

import { withFindOrInitAssociatedTokenAccount } from "../src";

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

/**
 * Pay and create mint and token account
 * @param connection
 * @param creator
 * @returns
 */
export const createMintTransaction = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  recipient: web3.PublicKey,
  mintId: web3.PublicKey,
  amount = 1,
  freezeAuthority: web3.PublicKey = recipient
): Promise<[web3.PublicKey, web3.Transaction]> => {
  const mintBalanceNeeded = await splToken.Token.getMinBalanceRentForExemptMint(
    connection
  );
  transaction.add(
    web3.SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintId,
      lamports: mintBalanceNeeded,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      space: splToken.MintLayout.span,
      programId: splToken.TOKEN_PROGRAM_ID,
    })
  );
  transaction.add(
    splToken.Token.createInitMintInstruction(
      splToken.TOKEN_PROGRAM_ID,
      mintId,
      0,
      wallet.publicKey,
      freezeAuthority
    )
  );
  const walletAta = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    wallet.publicKey,
    wallet.publicKey
  );
  if (amount > 0) {
    transaction.add(
      splToken.Token.createMintToInstruction(
        splToken.TOKEN_PROGRAM_ID,
        mintId,
        walletAta,
        wallet.publicKey,
        [],
        amount
      )
    );
  }
  return [walletAta, transaction];
};
