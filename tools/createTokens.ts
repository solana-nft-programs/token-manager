import { utils } from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";
import { connectionFor } from "./connection";

import { createMintTransaction, executeTransaction } from "./utils";

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
);

const BATCH_SIZE = 3;

const createTokens = async (
  count: number,
  cluster: string
): Promise<PublicKey[]> => {
  const connection = connectionFor(cluster);
  console.log(
    `--------- Minting ${count} nfts in batches of ${BATCH_SIZE} ---------`
  );
  const numberOfBatches = Math.floor(count / BATCH_SIZE);
  const remainder = count % BATCH_SIZE;
  const allMints: PublicKey[] = [];
  for (let i = 0; i < numberOfBatches; i++) {
    console.log(`--------- Batch ${i}/${numberOfBatches} ---------`);
    const transaction = new Transaction();
    const mintsInTx: PublicKey[] = [];
    const mintSigners: Keypair[] = [];
    for (let j = 0; j < BATCH_SIZE; j++) {
      const mintKeypair = Keypair.generate();
      await createMintTransaction(
        transaction,
        connection,
        new SignerWallet(wallet),
        wallet.publicKey,
        mintKeypair.publicKey,
        1,
        wallet.publicKey
      );
      mintsInTx.push(mintKeypair.publicKey);
      allMints.push(mintKeypair.publicKey);
      mintSigners.push(mintKeypair);
      console.log(`${j}`);
    }
    try {
      const txid = await executeTransaction(
        connection,
        new SignerWallet(wallet),
        transaction,
        {
          signers: mintSigners,
        }
      );
      console.log(
        `Succesfully minted  [${mintsInTx
          .map((e) => e.toString())
          .join()}] with transaction ${txid} (https://explorer.solana.com/tx/${txid}?cluster=${cluster})`
      );
    } catch (e) {
      console.log(e);
    }
  }
  const transaction = new Transaction();
  const mintsInTx: PublicKey[] = [];
  const mintSigners: Keypair[] = [];
  console.log(
    `--------- Batch ${numberOfBatches}/${numberOfBatches} ---------`
  );
  for (let i = 0; i < remainder; i++) {
    const mintKeypair = Keypair.generate();
    await createMintTransaction(
      transaction,
      connection,
      new SignerWallet(wallet),
      wallet.publicKey,
      mintKeypair.publicKey,
      1,
      wallet.publicKey
    );
    mintsInTx.push(mintKeypair.publicKey);
    allMints.push(mintKeypair.publicKey);
    mintSigners.push(mintKeypair);
    console.log(`${i}`);
  }
  try {
    const txid = await executeTransaction(
      connection,
      new SignerWallet(wallet),
      transaction,
      { signers: mintSigners }
    );
    console.log(
      `Succesfully minted  [${mintsInTx
        .map((e) => e.toString())
        .join()}] with transaction ${txid} (https://explorer.solana.com/tx/${txid}?cluster=${cluster})`
    );
  } catch (e) {
    console.log(e);
  }
  return allMints;
};

createTokens(10, "mainnet")
  .then((allMintIds) => {
    console.log(allMintIds.map((pk) => pk.toString()));
  })
  .catch((e) => {
    console.log(e);
  });
