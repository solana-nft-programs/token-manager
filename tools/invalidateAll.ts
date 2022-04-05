import { utils } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Connection } from "@solana/web3.js";
import {
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import type { AccountData } from "../src";
import { tryGetAccount, withFindOrInitAssociatedTokenAccount } from "../src";
import { claimApprover, timeInvalidator, tokenManager } from "../src/programs";
import { getAllClaimApprovers } from "../src/programs/claimApprover/accounts";
import { findClaimApproverAddress } from "../src/programs/claimApprover/pda";
import type { TimeInvalidatorData } from "../src/programs/timeInvalidator";
import { getAllTimeInvalidators } from "../src/programs/timeInvalidator/accounts";
import type { TokenManagerData } from "../src/programs/tokenManager";
import {
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
    transaction.add(
      await timeInvalidator.instruction.invalidate(
        connection,
        wallet,
        tokenManagerData.parsed.mint,
        tokenManagerData.pubkey,
        tokenManagerData.parsed.kind,
        tokenManagerData.parsed.state,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount.toString() ===
          PublicKey.default.toString()
          ? tokenManagerTokenAccountId
          : tokenManagerData?.parsed.recipientTokenAccount,
        remainingAccountsForReturn
      )
    );

    const [claimApproverId] = await findClaimApproverAddress(
      tokenManagerData.pubkey
    );

    if (
      tokenManagerData.parsed.claimApprover &&
      tokenManagerData.parsed.claimApprover.toString() ===
        claimApproverId.toString()
    ) {
      console.log("Close PCA: ", claimApproverId);
      transaction.add(
        claimApprover.instruction.close(
          connection,
          wallet,
          claimApproverId,
          tokenManagerData.pubkey
        )
      );
    }
  }

  console.log("Close TI: ", timeInvalidatorData.pubkey);
  transaction.add(
    timeInvalidator.instruction.close(
      connection,
      wallet,
      timeInvalidatorData.pubkey,
      timeInvalidatorData.parsed.tokenManager,
      timeInvalidatorData.parsed.collector
    )
  );

  return transaction;
};

export const withInvalidateTokenManager = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerData: AccountData<TokenManagerData>
): Promise<Transaction> => {
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
  transaction.add(
    await tokenManager.instruction.invalidate(
      connection,
      wallet,
      tokenManagerData.parsed.mint,
      tokenManagerData.pubkey,
      tokenManagerData.parsed.kind,
      tokenManagerData.parsed.state,
      tokenManagerTokenAccountId,
      tokenManagerData?.parsed.recipientTokenAccount.toString() ===
        PublicKey.default.toString()
        ? tokenManagerTokenAccountId
        : tokenManagerData?.parsed.recipientTokenAccount,
      remainingAccountsForReturn
    )
  );

  const [claimApproverId] = await findClaimApproverAddress(
    tokenManagerData.pubkey
  );

  if (
    tokenManagerData.parsed.claimApprover &&
    tokenManagerData.parsed.claimApprover.toString() ===
      claimApproverId.toString()
  ) {
    console.log("Close PCA: ", claimApproverId);
    transaction.add(
      claimApprover.instruction.close(
        connection,
        wallet,
        claimApproverId,
        tokenManagerData.pubkey
      )
    );
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
        new SignerWallet(wallet),
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
          new SignerWallet(wallet),
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
          new SignerWallet(wallet),
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
        transaction.add(
          claimApprover.instruction.close(
            connection,
            new SignerWallet(wallet),
            claimApproverData.pubkey,
            tokenManagerDatas[0]?.pubkey ?? claimApproverData.pubkey
          )
        );
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
