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
import { timeInvalidator, tokenManager } from "../src/programs";
import type { TimeInvalidatorData } from "../src/programs/timeInvalidator";
import { getAllTimeInvalidators } from "../src/programs/timeInvalidator/accounts";
import { withRemainingAccountsForReturn } from "../src/programs/tokenManager";
import { connectionFor } from "./connection";

// crk3AZsrZop64dURFeUykcVSynh2z9Cgh6zneLhcdj1
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(
    process.env.CRANK_SOLANA_KEY ||
      "4QsMvFnug6dzkHYmaQhepc5FjQZ5DgxAKCWryzWZDNyDcqk9wcwibTbE71NcjUK6UBKWrAbNw3rzFE374P4TDo5x"
  )
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
      tokenManagerData?.parsed.issuer,
      tokenManagerData.parsed.mint,
      tokenManagerData?.parsed.invalidationType,
      tokenManagerData?.parsed.receiptMint
    );

    let issuerPaymentMintTokenAccountId;
    if (tokenManagerData.parsed.paymentMint) {
      issuerPaymentMintTokenAccountId =
        await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          tokenManagerData.parsed.paymentMint,
          tokenManagerData?.parsed.issuer,
          wallet.publicKey
        );

      // create account to accept payment
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        tokenManagerData.parsed.paymentMint,
        tokenManagerData.pubkey,
        wallet.publicKey,
        true
      );
    }

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
        remainingAccountsForReturn,
        issuerPaymentMintTokenAccountId,
        tokenManagerData.parsed.paymentMint
      )
    );
  }
  console.log("Close TI: ", timeInvalidatorData.pubkey);
  transaction.add(
    timeInvalidator.instruction.close(
      connection,
      wallet,
      timeInvalidatorData.pubkey,
      timeInvalidatorData.parsed.tokenManager
    )
  );

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

invalidateAll().catch((e) => console.log(e));
