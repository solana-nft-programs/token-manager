import { chunkArray } from "@cardinal/common";
import { utils, Wallet } from "@project-serum/anchor";
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import { withUnissueToken } from "../src";
import { TokenManagerState } from "../src/programs/tokenManager";
import { getTokenManagersForIssuer } from "../src/programs/tokenManager/accounts";
import { connectionFor } from "./connection";

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
);
const BATCH_SIZE = 4;

const delist = async (cluster: string): Promise<string[]> => {
  const connection = connectionFor(cluster);
  const tokenManagersForIssuer = await getTokenManagersForIssuer(
    connection,
    wallet.publicKey
  );
  const mintIds = tokenManagersForIssuer
    .filter(
      (tokenManagers) => tokenManagers.parsed.state === TokenManagerState.Issued
    )
    .map((tokenManager) => tokenManager.parsed.mint);
  const chunkedEntries = chunkArray(mintIds, BATCH_SIZE);
  const allMintIds: string[] = [];
  for (let i = 0; i < chunkedEntries.length; i++) {
    console.log(`\n--------- Batch ${i}/${chunkedEntries.length} ---------`);
    const mintIds = chunkedEntries[i]!;
    const transaction = new Transaction();
    for (let j = 0; j < mintIds.length; j++) {
      const mintId = mintIds[j]!;
      console.log(`> Delisting mint (${mintId.toString()})`);
      try {
        await withUnissueToken(
          transaction,
          connection,
          new Wallet(wallet),
          mintId
        );
        allMintIds.push(mintId.toString());
      } catch (e) {
        /* empty */
      }
    }
    try {
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash("max")
      ).blockhash;
      transaction.sign(wallet);
      const txid = await sendAndConfirmRawTransaction(
        connection,
        transaction.serialize(),
        {
          commitment: "confirmed",
        }
      );
      console.log(
        `Successful transaction for https://explorer.solana.com/tx/${txid}?cluster=${cluster}`
      );
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
      console.log(`Failed to delist ${e}`);
    }
  }
  return allMintIds;
};

delist("mainnet")
  .then((allMintIds) => {
    console.log(allMintIds.map((pk) => pk.toString()));
  })
  .catch((e) => {
    console.log(e);
  });
