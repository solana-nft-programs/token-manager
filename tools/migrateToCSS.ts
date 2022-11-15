import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";

import dotenv from "dotenv";
import { executeTransaction } from "./utils";
import { connectionFor } from "./connection";
import { withMigrate } from "../src";

dotenv.config();

const wallet = new anchor.Wallet(
  Keypair.fromSecretKey(
    anchor.utils.bytes.bs58.decode(process.env.MIGRATE_KEYPAIR || "")
  )
); // your wallet's secret key
const rulesetName = "ruleset-no-checks";
const collector = new PublicKey("gmdS6fDgVbeCCYwwvTPJRKM9bFbAgSZh6MTDUT2DcgV");

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transaction = new Transaction();

  // TODO replace with get all token managers of kind Permissioned
  const mintId = new PublicKey("pubkey");
  const accounts = (
    await connection.getTokenLargestAccounts(mintId)
  ).value.filter((account) => account.uiAmount && account.uiAmount > 0);
  if (accounts.length > 1) {
    throw "Invalid mint, supply greater that one";
  }
  const holderTokenAccount = accounts[0]!;

  await withMigrate(
    transaction,
    connection,
    wallet,
    mintId,
    rulesetName,
    holderTokenAccount.address,
    collector,
    wallet.publicKey
  );

  try {
    const txid = await executeTransaction(connection, wallet, transaction, {});
    console.log(
      `Successfully migrated token to CSS standard https://explorer.solana.com/tx/${txid}?cluster=${cluster}.`
    );
  } catch (e) {
    console.log(`Transactionn failed: ${e}`);
  }
};

main().catch((e) => console.log(e));
