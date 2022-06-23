/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { Wallet } from "@saberhq/solana-contrib";
import * as splToken from "@solana/spl-token";
import { Connection } from "@solana/web3.js";
import * as web3 from "@solana/web3.js";

import { withFindOrInitAssociatedTokenAccount } from "../src";

export const chunkArray = (arr: any[], size: number): any[][] =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

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

export const executeTransaction = async (
  connection: Connection,
  wallet: Wallet,
  transaction: web3.Transaction,
  config: {
    silent?: boolean;
    signers?: web3.Signer[];
    confirmOptions?: web3.ConfirmOptions;
    callback?: (success: boolean) => void;
  }
): Promise<string> => {
  let txid = "";
  try {
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (
      await connection.getRecentBlockhash("max")
    ).blockhash;
    await wallet.signTransaction(transaction);
    if (config.signers && config.signers.length > 0) {
      transaction.partialSign(...config.signers);
    }
    txid = await web3.sendAndConfirmRawTransaction(
      connection,
      transaction.serialize(),
      config.confirmOptions
    );
    config.callback && config.callback(true);
    console.log("Successful tx", txid);
  } catch (e: unknown) {
    console.log(
      "Failed transaction: ",
      (e as web3.SendTransactionError).logs,
      e
    );
    config.callback && config.callback(false);
    if (!config.silent) {
      throw e;
    }
  }
  return txid;
};
