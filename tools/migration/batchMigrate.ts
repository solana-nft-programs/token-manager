import type { AccountData } from "@cardinal/common";
import {
  chunkArray,
  findMintEditionId,
  findMintMetadataId,
  METADATA_PROGRAM_ID,
} from "@cardinal/common";
import { BorshAccountsCoder, utils, Wallet } from "@project-serum/anchor";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import * as dotenv from "dotenv";

import type { TokenManagerData } from "../../src/programs/tokenManager";
import {
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_IDL,
  TokenManagerKind,
  tokenManagerProgram,
} from "../../src/programs/tokenManager";
import {
  findMintManagerId,
  findTokenManagerAddress,
} from "../../src/programs/tokenManager/pda";
import { connectionFor } from "../connection";
import { executeTransactionBatches, keypairFrom } from "../utils";

dotenv.config();

const BATCH_SIZE = 4;
const PARALLET_BATCH_SIZE = 50;
const DRY_RUN = true;

const wallet = keypairFrom(process.env.WALLET ?? "");

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);
  console.log(wallet.publicKey.toString());

  console.log(`\n1/3 Fetching data...`);
  const programAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("tokenManager")
            ),
          },
        },
        {
          memcmp: {
            offset: 91,
            bytes: utils.bytes.bs58.encode(
              new BN(TokenManagerKind.Permissioned).toArrayLike(Buffer, "le", 1)
            ),
          },
        },
      ],
    }
  );
  console.log(
    "Total found ",
    programAccounts.length,
    programAccounts.map((p) => p.pubkey.toString())
  );

  const tokenManagerDatas: AccountData<TokenManagerData>[] = [];
  const coder = new BorshAccountsCoder(TOKEN_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      const tokenManagerData: TokenManagerData = coder.decode(
        "tokenManager",
        account.account.data
      );
      if (
        tokenManagerData
        // tokenManagerData.invalidators
        //   .map((s) => s.toString())
        //   .includes("brvnPPYVUpU2ZQqmTX7XxzZErdtFj4brXH8CCicbbB9")
      ) {
        tokenManagerDatas.push({
          ...account,
          parsed: tokenManagerData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode token manager data`);
    }
  });
  console.log("Total found ", tokenManagerDatas.length);

  console.log(
    `\n1/3 Building transactions ${tokenManagerDatas.length} data...`
  );
  const chunks = chunkArray(tokenManagerDatas, BATCH_SIZE);
  const txs: Transaction[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]!;
    console.log(`${i + 1}/${chunks.length}`);
    const tx = new Transaction();
    for (let j = 0; j < chunk.length; j++) {
      const tokenManagerData = chunk[j]!;
      console.log(
        `>>[${i}/${chunks.length}][${j + 1}/${
          chunk.length
        }] (${tokenManagerData.parsed.mint.toString()})`
      );
      const mintId = tokenManagerData.parsed.mint;
      const ix = await tokenManagerProgram(connection, new Wallet(wallet))
        .methods.migrate()
        .accountsStrict({
          mintManager: findMintManagerId(mintId),
          tokenManager: findTokenManagerAddress(mintId),
          tokenManagerTokenAccount: getAssociatedTokenAddressSync(
            mintId,
            findTokenManagerAddress(mintId),
            true
          ),
          mint: mintId,
          mintMetadata: findMintMetadataId(mintId),
          mintEdition: findMintEditionId(mintId),
          holderTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
          invalidator: wallet.publicKey,
          collector: wallet.publicKey,
          payer: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          mplTokenMetadata: METADATA_PROGRAM_ID,
        })
        .instruction();
      tx.add(ix);
    }
    if (tx.instructions.length > 0) {
      txs.push(tx);
    }
  }

  console.log(
    `\n3/3 Executing ${txs.length} transactions batches=${PARALLET_BATCH_SIZE}...`
  );
  if (!DRY_RUN) {
    await executeTransactionBatches(connection, txs, new Wallet(wallet), {
      batchSize: PARALLET_BATCH_SIZE,
      successHandler: (txid, { i, j, it, jt }) =>
        console.log(
          `>> ${i + 1}/${it} ${
            j + 1
          }/${jt} https://explorer.solana.com/tx/${txid}`
        ),
      errorHandler: (e, { i, j, it, jt }) =>
        console.log(`>> ${i + 1}/${it} ${j + 1}/${jt} error=`, e),
    });
  }
};

main("mainnet-beta").catch((e) => console.log(e));
