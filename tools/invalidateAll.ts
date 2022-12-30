import type { AccountData } from "@cardinal/common";
import {
  tryGetAccount,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import { utils, Wallet } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type { Connection } from "@solana/web3.js";
import {
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { tokenManager } from "../src/programs";
import { claimApproverProgram } from "../src/programs/claimApprover";
import { getAllClaimApprovers } from "../src/programs/claimApprover/accounts";
import { findClaimApproverAddress } from "../src/programs/claimApprover/pda";
import type { TimeInvalidatorData } from "../src/programs/timeInvalidator";
import { timeInvalidatorProgram } from "../src/programs/timeInvalidator";
import { getAllTimeInvalidators } from "../src/programs/timeInvalidator/accounts";
import type { TokenManagerData } from "../src/programs/tokenManager";
import {
  CRANK_KEY,
  getRemainingAccountsForKind,
  TOKEN_MANAGER_ADDRESS,
  tokenManagerProgram,
  TokenManagerState,
  withRemainingAccountsForReturn,
} from "../src/programs/tokenManager";
import { getTokenManagersByState } from "../src/programs/tokenManager/accounts";
import { connectionFor } from "./connection";

// crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.CRANK_SOLANA_KEY || "")
);

export const withInvalidate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  timeInvalidatorData: AccountData<TimeInvalidatorData>
): Promise<Transaction> => {
  const caProgram = claimApproverProgram(connection, wallet);
  const tmeInvalidatorProgram = timeInvalidatorProgram(connection, wallet);

  const tokenManagerData = await tryGetAccount(() =>
    tokenManager.accounts.getTokenManager(
      connection,
      timeInvalidatorData?.parsed.tokenManager
    )
  );
  console.log(tokenManagerData);

  if (tokenManagerData) {
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
      connection,
      wallet,
      tokenManagerData
    );

    if (
      tokenManagerData?.parsed.recipientTokenAccount.toString() ===
      PublicKey.default.toString()
    ) {
      console.log("TM with incorrect recipient token account");
    }
    console.log(
      "Invalidate TM: ",
      tokenManagerData?.pubkey.toString(),
      tokenManagerData?.parsed.state
    );
    const transferAccounts = getRemainingAccountsForKind(
      tokenManagerData.parsed.mint,
      tokenManagerData.parsed.kind
    );
    const invalidateIx = await tmeInvalidatorProgram.methods
      .invalidate()
      .accounts({
        tokenManager: tokenManagerData.pubkey,
        timeInvalidator: timeInvalidatorData.pubkey,
        invalidator: wallet.publicKey,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        mint: tokenManagerData.parsed.mint,
        recipientTokenAccount:
          tokenManagerData?.parsed.recipientTokenAccount.toString() ===
          PublicKey.default.toString()
            ? tokenManagerTokenAccountId
            : tokenManagerData?.parsed.recipientTokenAccount,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts([
        ...(tokenManagerData.parsed.state === TokenManagerState.Claimed
          ? transferAccounts
          : []),
        ...remainingAccountsForReturn,
      ])
      .instruction();
    transaction.add(invalidateIx);

    const claimApproverId = findClaimApproverAddress(tokenManagerData.pubkey);

    if (
      tokenManagerData.parsed.claimApprover &&
      tokenManagerData.parsed.claimApprover.toString() ===
        claimApproverId.toString()
    ) {
      console.log("Close PCA: ", claimApproverId);
      const closeIx = await caProgram.methods
        .close()
        .accounts({
          tokenManager: tokenManagerData.pubkey,
          claimApprover: claimApproverId,
          collector: CRANK_KEY,
          closer: wallet.publicKey,
        })
        .instruction();
      transaction.add(closeIx);
    }
  }

  console.log("Close TI: ", timeInvalidatorData.pubkey);
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

  return transaction;
};

export const withInvalidateTokenManager = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerData: AccountData<TokenManagerData>
): Promise<Transaction> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const caProgram = claimApproverProgram(connection, wallet);
  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    tokenManagerData.parsed.mint,
    tokenManagerData.pubkey,
    wallet.publicKey,
    true
  );

  const remainingAccountsForReturn = await withRemainingAccountsForReturn(
    transaction,
    connection,
    wallet,
    tokenManagerData
  );

  if (
    tokenManagerData?.parsed.recipientTokenAccount.toString() ===
    PublicKey.default.toString()
  ) {
    console.log("TM with incorrect recipient token account");
  }
  console.log(
    "Invalidate TM: ",
    tokenManagerData?.pubkey.toString(),
    tokenManagerData?.parsed.state,
    remainingAccountsForReturn
  );
  const transferAccounts = getRemainingAccountsForKind(
    tokenManagerData.parsed.mint,
    tokenManagerData.parsed.kind
  );
  const invalidateIx = await tmManagerProgram.methods
    .invalidate()
    .accounts({
      tokenManager: tokenManagerData.pubkey,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      mint: tokenManagerData.parsed.mint,
      recipientTokenAccount:
        tokenManagerData?.parsed.recipientTokenAccount.toString() ===
        PublicKey.default.toString()
          ? tokenManagerTokenAccountId
          : tokenManagerData?.parsed.recipientTokenAccount,
      invalidator: wallet.publicKey,
      collector: CRANK_KEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .remainingAccounts([
      ...(tokenManagerData.parsed.state === TokenManagerState.Claimed
        ? transferAccounts
        : []),
      ...remainingAccountsForReturn,
    ])
    .instruction();
  transaction.add(invalidateIx);

  const claimApproverId = findClaimApproverAddress(tokenManagerData.pubkey);

  if (
    tokenManagerData.parsed.claimApprover &&
    tokenManagerData.parsed.claimApprover.toString() ===
      claimApproverId.toString()
  ) {
    console.log("Close PCA: ", claimApproverId);
    const closeIx = await caProgram.methods
      .close()
      .accounts({
        tokenManager: tokenManagerData.pubkey,
        claimApprover: claimApproverId,
        collector: CRANK_KEY,
        closer: wallet.publicKey,
      })
      .instruction();
    transaction.add(closeIx);
  }
  return transaction;
};

const main = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const timeInvalidatorDatas = await getAllTimeInvalidators(connection);
  console.log(
    `---------------Found ${timeInvalidatorDatas.length} time invalidators on ${cluster} ---------------`
  );
  for (let i = 0; i < timeInvalidatorDatas.length; i++) {
    const timeInvalidatorData = timeInvalidatorDatas[i];
    if (timeInvalidatorData) {
      const transaction = await withInvalidate(
        new Transaction(),
        connection,
        new Wallet(wallet),
        timeInvalidatorData
      );
      if (transaction && transaction.instructions.length > 0) {
        const txid = await executeTx(transaction, connection);
        console.log(
          `Succesfully invalidated time invalidator (${timeInvalidatorData?.pubkey.toBase58()}) token manager id (${timeInvalidatorData?.pubkey.toBase58()}) with txid (${txid})`
        );
      }
    }
  }
};

const tokenManagers = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const tokenManagerDatas = await getTokenManagersByState(connection, null);
  console.log(
    `---------------Found ${tokenManagerDatas.length} token managers on ${cluster} ---------------`
  );
  for (let i = 0; i < tokenManagerDatas.length; i++) {
    const tokenManagerData = tokenManagerDatas[i];
    if (tokenManagerData) {
      try {
        const transaction = new Transaction();
        console.log(`Invalidating TokenManager ${i}`);
        await withInvalidateTokenManager(
          transaction,
          connection,
          new Wallet(wallet),
          tokenManagerData
        );
        const txid = await executeTx(transaction, connection);
        console.log(
          `Succesfully invalidated toke manager with txid (${txid})`,
          tokenManagerData.parsed
        );
      } catch (e) {
        console.log(`Failed to invalidate: `, e);
      }
    }
  }
};

const claimApprovers = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const caProgram = claimApproverProgram(connection);
  const tokenManagerDatas = await getTokenManagersByState(connection, null);
  const claimApproverDatas = await getAllClaimApprovers(connection);
  // const claimApproverIds = claimApproverDatas.map((i) => i.pubkey.toString());
  console.log(
    `---------------Found ${claimApproverDatas.length} claim approvers on ${cluster} ---------------`
  );
  let count = 0;
  for (let i = 0; i < tokenManagerDatas.length; i++) {
    const tokenManagerData = tokenManagerDatas[i];
    if (
      tokenManagerData &&
      tokenManagerData.parsed.claimApprover &&
      tokenManagerData.parsed.state === TokenManagerState.Issued
    ) {
      try {
        const transaction = new Transaction();
        console.log(`Invalidating CPA ${count}`);
        await withInvalidateTokenManager(
          transaction,
          connection,
          new Wallet(wallet),
          tokenManagerData
        );
        count += 1;
        const txid = await executeTx(transaction, connection);
        console.log(
          `Succesfully invalidated time invalidator (${tokenManagerData.parsed.claimApprover.toBase58()}) token manager id (${tokenManagerData.parsed.claimApprover.toBase58()}) with txid (${txid})`
        );
      } catch (e) {
        console.log(`Failed to invalidate: `, e);
      }
    }
  }
  const remainingClaimApproverDatas = await getAllClaimApprovers(connection);
  console.log(
    `---------------Found ${remainingClaimApproverDatas.length} claim approvers remaining on ${cluster} ---------------`
  );
  console.log(tokenManagerDatas[2]);
  for (let i = 0; i < remainingClaimApproverDatas.length; i++) {
    const claimApproverData = remainingClaimApproverDatas[i];
    if (claimApproverData) {
      try {
        const transaction = new Transaction();
        console.log(`Invalidating remaining CPA ${count}`);
        const closeIx = await caProgram.methods
          .close()
          .accounts({
            tokenManager:
              tokenManagerDatas[0]?.pubkey ??
              claimApproverData.parsed.tokenManager,
            claimApprover: claimApproverData.pubkey,
            collector: CRANK_KEY,
            closer: wallet.publicKey,
          })
          .instruction();
        transaction.add(closeIx);
        count += 1;
        const txid = await executeTx(transaction, connection);
        console.log(
          `Succesfully invalidated claim approver (${claimApproverData.pubkey.toBase58()}) claim approver id (${claimApproverData.pubkey.toBase58()}) with txid (${txid})`
        );
      } catch (e) {
        console.log(`Failed to invalidate: `, e);
      }
    }
  }
};

const executeTx = async (transaction: Transaction, connection: Connection) => {
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("max")
  ).blockhash;
  transaction.sign(wallet);
  return await sendAndConfirmRawTransaction(
    connection,
    transaction.serialize()
  );
};

export const invalidateAll = async (mainnet = true) => {
  if (mainnet) {
    try {
      await tokenManagers("mainnet");
      // await main("mainnet");
      // await claimApprovers("mainnet");
    } catch (e) {
      console.log("Failed to invalidate on mainnet: ", e);
    }
  }

  try {
    // await tokenManagers("devnet");
    // await main("devnet");
    // await claimApprovers("devnet");
  } catch (e) {
    console.log("Failed to invalidate on devnet: ", e);
  }
};

invalidateAll().catch((e) => console.log(e));
console.log(main, claimApprovers);
