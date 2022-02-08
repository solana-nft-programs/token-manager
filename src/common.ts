import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import { timeInvalidator, tokenManager, useInvalidator } from "./programs";
import { tokenManagerAddressFromMint } from "./programs/tokenManager/pda";
import { tryGetAccount, withFindOrInitAssociatedTokenAccount } from "./utils";

export const useTransaction = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  usages: number
): Promise<Transaction> => {
  const transaction = new Transaction();
  const tokenManagerId = await tokenManagerAddressFromMint(connection, mintId);

  const [useInvalidatorId] = await useInvalidator.pda.findUseInvalidatorAddress(
    tokenManagerId
  );

  const [useInvalidatorData, tokenManagerData] = await Promise.all([
    tryGetAccount(() =>
      useInvalidator.accounts.getUseInvalidator(connection, useInvalidatorId)
    ),
    tryGetAccount(() =>
      tokenManager.accounts.getTokenManager(connection, tokenManagerId)
    ),
  ]);

  if (!useInvalidatorData) {
    // init
    const [InitTx] = await useInvalidator.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      null
    );
    transaction.add(InitTx);
  }

  if (!tokenManagerData?.parsed.recipientTokenAccount)
    throw new Error("Token manager has not been claimed");

  // use
  transaction.add(
    await useInvalidator.instruction.incrementUsages(
      connection,
      wallet,
      tokenManagerId,
      tokenManagerData?.parsed.recipientTokenAccount,
      usages
    )
  );
  return transaction;
};

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
  const transaction = new Transaction();
  const tokenManagerId = await tokenManagerAddressFromMint(connection, mintId);

  const [[useInvalidatorId], [timeInvalidatorId]] = await Promise.all([
    useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId),
    timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId),
  ]);

  const [useInvalidatorData, timeInvalidatorData, tokenManagerData] =
    await Promise.all([
      tryGetAccount(() =>
        useInvalidator.accounts.getUseInvalidator(connection, useInvalidatorId)
      ),
      tryGetAccount(() =>
        timeInvalidator.accounts.getTimeInvalidator(
          connection,
          timeInvalidatorId
        )
      ),
      tryGetAccount(() =>
        tokenManager.accounts.getTokenManager(connection, tokenManagerId)
      ),
    ]);

  if (!tokenManagerData) return transaction;

  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    tokenManagerId,
    wallet.publicKey,
    true
  );

  const issuerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    tokenManagerData?.parsed.issuer,
    wallet.publicKey
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
  }

  if (
    useInvalidatorData &&
    useInvalidatorData.parsed.maxUsages &&
    useInvalidatorData.parsed.usages.gte(useInvalidatorData.parsed.maxUsages)
  ) {
    transaction.add(
      await useInvalidator.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        issuerTokenAccountId,
        issuerPaymentMintTokenAccountId,
        tokenManagerData.parsed.paymentMint
      )
    );
  } else if (
    timeInvalidatorData &&
    timeInvalidatorData.parsed.expiration &&
    timeInvalidatorData.parsed.expiration.lte(new BN(Date.now() / 1000))
  ) {
    transaction.add(
      await timeInvalidator.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        issuerTokenAccountId,
        issuerPaymentMintTokenAccountId,
        tokenManagerData.parsed.paymentMint
      )
    );
  }

  return transaction;
};
