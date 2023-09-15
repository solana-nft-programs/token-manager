import {
  AccountData,
  withFindOrInitAssociatedTokenAccount,
} from "@solana-nft-programs/common";
import { programs } from "@solana-nft-programs/token-manager";
import { timeInvalidator } from "@solana-nft-programs/token-manager/dist/cjs/programs";
import { timeInvalidatorProgram } from "@solana-nft-programs/token-manager/dist/cjs/programs/timeInvalidator";
import { shouldTimeInvalidate } from "@solana-nft-programs/token-manager/dist/cjs/programs/timeInvalidator/utils";
import {
  TokenManagerData,
  TOKEN_MANAGER_ADDRESS,
  withRemainingAccountsForReturn,
} from "@solana-nft-programs/token-manager/dist/cjs/programs/tokenManager";
import { utils, Wallet } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  Connection,
  Keypair,
  sendAndConfirmRawTransaction,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { connectionFor, secondaryConnectionFor } from "../common/connection";

// crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.SOLANA_CRANK_KEY || "")
);

const getSolanaClock = async (
  connection: Connection
): Promise<number | null> => {
  const epochInfo = await connection.getEpochInfo();
  const blockTimeInEpoch = await connection.getBlockTime(
    epochInfo.absoluteSlot
  );
  return blockTimeInEpoch;
};

const main = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const tmeInvalidatorProgram = timeInvalidatorProgram(
    connection,
    new Wallet(wallet)
  );
  const startTime = Date.now() / 1000;
  let solanaClock = await getSolanaClock(connection);
  if (!solanaClock) {
    console.log(
      `[Error] Failed to get solana clock falling back to local time (${startTime})`
    );
    solanaClock = startTime;
  }

  const allTimeInvalidators =
    await programs.timeInvalidator.accounts.getAllTimeInvalidators(connection);

  const tokenManagerIds = allTimeInvalidators.map(
    (timeInvalidator) => timeInvalidator.parsed.tokenManager
  );

  const tokenManagers = (
    await programs.tokenManager.accounts.getTokenManagers(
      connection,
      tokenManagerIds
    )
  ).filter((x): x is AccountData<TokenManagerData> => x !== null);

  console.log(
    `--------------- ${wallet.publicKey.toString()} found ${
      allTimeInvalidators.length
    } expired invalidators found on ${cluster} ---------------`
  );

  for (let i = 0; i < allTimeInvalidators.length; i++) {
    const timeInvalidatorData = allTimeInvalidators[i]!;
    try {
      console.log(
        `\n\n\n\n\n--------------- ${i}/${allTimeInvalidators.length}`,
        timeInvalidatorData.pubkey.toString(),
        timeInvalidatorData.parsed.tokenManager.toString(),
        "---------------"
      );

      const tokenManagerData = tokenManagers.find(
        (tokenManager) =>
          tokenManager.pubkey.toString() ===
          timeInvalidatorData.parsed.tokenManager.toString()
      );

      const transaction = new Transaction();
      if (!tokenManagerData) {
        const closeIx = await tmeInvalidatorProgram.methods
          .close()
          .accounts({
            tokenManager: timeInvalidatorData.parsed.tokenManager,
            timeInvalidator: timeInvalidatorData.pubkey,
            collector: timeInvalidatorData.parsed.collector,
            closer: wallet.publicKey,
          })
          .instruction();
        transaction.add(closeIx);
      } else if (
        shouldTimeInvalidate(
          tokenManagerData,
          timeInvalidatorData,
          solanaClock + (Date.now() / 1000 - startTime)
        )
      ) {
        const tokenManagerTokenAccountId =
          await withFindOrInitAssociatedTokenAccount(
            transaction,
            connection,
            tokenManagerData.parsed.mint,
            tokenManagerData.pubkey,
            wallet.publicKey,
            true
          );
        const remainingAccountsForReturn = await withRemainingAccountsForReturn(
          transaction,
          tokenManagerData?.parsed.receiptMint
            ? secondaryConnectionFor(cluster)
            : connection,
          new Wallet(wallet),
          tokenManagerData
        );
        const invalidateIx = await tmeInvalidatorProgram.methods
          .invalidate()
          .accountsStrict({
            tokenManager: timeInvalidatorData.parsed.tokenManager,
            timeInvalidator: timeInvalidatorData.pubkey,
            invalidator: wallet.publicKey,
            solanaNftProgramsTokenManager: TOKEN_MANAGER_ADDRESS,
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenManagerTokenAccount: tokenManagerTokenAccountId,
            mint: tokenManagerData.parsed.mint,
            recipientTokenAccount:
              tokenManagerData?.parsed.recipientTokenAccount,
            rent: SYSVAR_RENT_PUBKEY,
          })
          .remainingAccounts(remainingAccountsForReturn)
          .instruction();
        transaction.add(invalidateIx);
        const closeIx = await tmeInvalidatorProgram.methods
          .close()
          .accounts({
            tokenManager: timeInvalidatorData.parsed.tokenManager,
            timeInvalidator: timeInvalidatorData.pubkey,
            collector: timeInvalidatorData.parsed.collector,
            closer: wallet.publicKey,
          })
          .instruction();
        transaction.add(closeIx);
      } else {
        console.log(
          `Skipping this time invalidator for mint (${tokenManagerData.parsed.mint.toString()})`
        );
      }

      if (transaction && transaction.instructions.length > 0) {
        transaction.feePayer = wallet.publicKey;
        transaction.recentBlockhash = (
          await connection.getRecentBlockhash("max")
        ).blockhash;
        transaction.sign(wallet);
        const txid = await sendAndConfirmRawTransaction(
          connection,
          transaction.serialize()
        );
        console.log(
          `Succesfully invalidated time invalidator (${timeInvalidatorData.pubkey.toBase58()}) token manager id (${
            tokenManagerData?.pubkey.toBase58() || ""
          }) with txid (${txid})`
        );
      } else {
        console.log(
          `No transaction for time invalidator (${timeInvalidatorData.pubkey.toBase58()}) token manager id (${
            tokenManagerData?.pubkey.toBase58() || ""
          }) mint (${tokenManagerData?.parsed.mint.toBase58() || ""})`
        );
      }
    } catch (e) {
      console.log(
        `Failed to invalidate time invalidator (${timeInvalidatorData.pubkey.toBase58()})`,
        e
      );
    }
  }
};

export const invalidateAll = async (mainnet = true) => {
  if (mainnet) {
    try {
      await main("mainnet");
    } catch (e) {
      console.log("Failed to invalidate on mainnet: ", e);
    }
  }

  try {
    await main("devnet");
  } catch (e) {
    console.log("Failed to invalidate on devnet: ", e);
  }
};
