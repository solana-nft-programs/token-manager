import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

import { findAta } from ".";
import {
  claimApprover,
  timeInvalidator,
  tokenManager,
  useInvalidator,
} from "./programs";
import { InvalidationType, TokenManagerKind } from "./programs/tokenManager";
import { tokenManagerAddressFromMint } from "./programs/tokenManager/pda";
import { withRemainingAccountsForReturn } from "./programs/tokenManager/utils";
import { tryGetAccount, withFindOrInitAssociatedTokenAccount } from "./utils";

export type IssueParameters = {
  paymentAmount?: number;
  paymentMint?: PublicKey;
  expiration?: number;
  usages?: number;
  mint: PublicKey;
  amount?: BN;
  issuerTokenAccountId: PublicKey;
  visibility?: "private" | "public";
  kind?: TokenManagerKind;
  invalidationType?: InvalidationType;
  receipt?: boolean;
};

/**
 * Main method for issuing any managed token
 * Allows for optional payment, optional usages or expiration and includes a otp for private links
 * @param connection
 * @param wallet
 * @param parameters
 * @returns Transaction, public key for the created token manager and a otp if necessary for private links
 */
export const withIssueToken = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  {
    paymentAmount,
    paymentMint,
    expiration,
    usages,
    mint,
    amount = new BN(1),
    issuerTokenAccountId,
    kind = TokenManagerKind.Managed,
    invalidationType = InvalidationType.Return,
    visibility = "public",
    receipt = false,
  }: IssueParameters
): Promise<[Transaction, PublicKey, Keypair | undefined]> => {
  // init token manager
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    mint,
    issuerTokenAccountId
  );
  transaction.add(tokenManagerIx);

  //////////////////////////////
  /////// claim approver ///////
  //////////////////////////////
  let otp;
  if (paymentAmount && paymentMint) {
    if (visibility === "private") {
      throw new Error("Private links do not currently support payment");
    }

    // set payment mint
    transaction.add(
      tokenManager.instruction.setPaymentMint(
        connection,
        wallet,
        tokenManagerId,
        paymentMint
      )
    );

    // init claim approver
    const [paidClaimApproverIx, paidClaimApproverId] =
      await claimApprover.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        paymentAmount
      );
    transaction.add(paidClaimApproverIx);
    transaction.add(
      tokenManager.instruction.setClaimApprover(
        connection,
        wallet,
        tokenManagerId,
        paidClaimApproverId
      )
    );
  } else if (visibility === "private") {
    otp = Keypair.generate();
    transaction.add(
      tokenManager.instruction.setClaimApprover(
        connection,
        wallet,
        tokenManagerId,
        otp.publicKey
      )
    );
  }

  //////////////////////////////
  /////// time invalidator /////
  //////////////////////////////
  if (expiration) {
    const [timeInvalidatorIx, timeInvalidatorId] =
      await timeInvalidator.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        expiration
      );
    transaction.add(timeInvalidatorIx);
    transaction.add(
      tokenManager.instruction.addInvalidator(
        connection,
        wallet,
        tokenManagerId,
        timeInvalidatorId
      )
    );
  } else {
    const [timeInvalidatorId] =
      await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
    const timeInvalidatorData = await tryGetAccount(() =>
      timeInvalidator.accounts.getTimeInvalidator(connection, timeInvalidatorId)
    );
    if (timeInvalidatorData) {
      transaction.add(
        timeInvalidator.instruction.close(
          connection,
          wallet,
          timeInvalidatorId,
          tokenManagerId
        )
      );
    }
  }

  //////////////////////////////
  /////////// usages ///////////
  //////////////////////////////
  if (usages) {
    const [useInvalidatorIx, useInvalidatorId] =
      await useInvalidator.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        usages
      );
    transaction.add(useInvalidatorIx);
    transaction.add(
      tokenManager.instruction.addInvalidator(
        connection,
        wallet,
        tokenManagerId,
        useInvalidatorId
      )
    );
  } else {
    const [useInvalidatorId] =
      await useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await tryGetAccount(() =>
      useInvalidator.accounts.getUseInvalidator(connection, useInvalidatorId)
    );
    if (useInvalidatorData) {
      transaction.add(
        useInvalidator.instruction.close(
          connection,
          wallet,
          useInvalidatorId,
          tokenManagerId
        )
      );
    }
  }

  if (kind === TokenManagerKind.Managed) {
    const [mintManagerIx, mintManagerId] =
      await tokenManager.instruction.creatMintManager(connection, wallet, mint);

    const mintManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getMintManager(connection, mintManagerId)
    );
    if (!mintManagerData) {
      transaction.add(mintManagerIx);
    }
  }

  // issuer
  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mint,
    tokenManagerId,
    wallet.publicKey,
    true
  );

  transaction.add(
    tokenManager.instruction.issue(
      connection,
      wallet,
      tokenManagerId,
      amount,
      tokenManagerTokenAccountId,
      issuerTokenAccountId,
      kind,
      invalidationType
    )
  );

  //////////////////////////////
  //////////// index ///////////
  //////////////////////////////
  if (receipt) {
    throw new Error("Index not implemented");
    // const receiptCounterData = await tryGetAccount(() =>
    //   receiptIndex.accounts.getReceiptCounter(connection, wallet.publicKey)
    // );
    // if (!receiptCounterData) {
    //   const [receiptCounterInitIx] = await receiptIndex.instruction.init(
    //     connection,
    //     wallet,
    //     wallet.publicKey
    //   );
    //   transaction.add(receiptCounterInitIx);
    // }
    // transaction.add(
    //   await receiptIndex.instruction.add(
    //     connection,
    //     wallet,
    //     wallet.publicKey,
    //     tokenManagerId,
    //     receiptCounterData?.parsed.count.add(new BN(1)) || new BN(0)
    //   )
    // );
  }

  return [transaction, tokenManagerId, otp];
};

/**
 * Add claim instructions to a transaction
 * @param transaction
 * @param connection
 * @param wallet
 * @param tokenManagerId
 * @param otpKeypair
 * @returns Transaction with relevent claim instructions added
 */
export const withClaimToken = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  otpKeypair?: Keypair | null
): Promise<Transaction> => {
  const tokenManagerData = await tokenManager.accounts.getTokenManager(
    connection,
    tokenManagerId
  );

  let claimReceiptId;

  // pay claim approver
  if (
    tokenManagerData.parsed.claimApprover &&
    tokenManagerData.parsed.paymentMint
  ) {
    const paymentTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      tokenManagerData.parsed.paymentMint,
      tokenManagerId,
      wallet.publicKey,
      true
    );

    const payerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      tokenManagerData.parsed.paymentMint,
      wallet.publicKey,
      wallet.publicKey
    );

    [claimReceiptId] = await tokenManager.pda.findClaimReceiptId(
      tokenManagerId,
      wallet.publicKey
    );

    transaction.add(
      await claimApprover.instruction.pay(
        connection,
        wallet,
        tokenManagerId,
        paymentTokenAccountId,
        payerTokenAccountId
      )
    );
  } else if (tokenManagerData.parsed.claimApprover) {
    if (
      !otpKeypair ||
      otpKeypair.publicKey.toString() !==
        tokenManagerData.parsed.claimApprover.toString()
    ) {
      throw new Error("Invalid OTP");
    }
    // approve claim request
    const [createClaimReceiptIx, claimReceipt] =
      await tokenManager.instruction.createClaimReceipt(
        connection,
        wallet,
        tokenManagerId,
        otpKeypair.publicKey
      );
    transaction.add(createClaimReceiptIx);
    claimReceiptId = claimReceipt;
  }

  const tokenManagerTokenAccountId = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenManagerData.parsed.mint,
    tokenManagerId,
    true
  );

  const recipientTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    tokenManagerData.parsed.mint,
    wallet.publicKey,
    wallet.publicKey
  );

  // claim
  transaction.add(
    await tokenManager.instruction.claim(
      connection,
      wallet,
      tokenManagerId,
      tokenManagerData.parsed.kind,
      tokenManagerData.parsed.mint,
      tokenManagerTokenAccountId,
      recipientTokenAccountId,
      claimReceiptId
    )
  );

  return transaction;
};

export const withUnissueToken = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
  const tokenManagerId = await tokenManagerAddressFromMint(connection, mintId);

  const tokenManagerTokenAccountId = await findAta(
    mintId,
    tokenManagerId,
    true
  );

  const issuerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    wallet.publicKey,
    wallet.publicKey
  );

  return transaction.add(
    tokenManager.instruction.unissue(
      connection,
      wallet,
      tokenManagerId,
      tokenManagerTokenAccountId,
      issuerTokenAccountId
    )
  );
};

export const withInvalidate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
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

  const remainingAccountsForReturn = await withRemainingAccountsForReturn(
    transaction,
    connection,
    wallet,
    tokenManagerData?.parsed.issuer,
    mintId,
    tokenManagerData?.parsed.invalidationType
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
        remainingAccountsForReturn,
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
        remainingAccountsForReturn,
        issuerPaymentMintTokenAccountId,
        tokenManagerData.parsed.paymentMint
      )
    );
  }

  return transaction;
};

export const withUse = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  usages: number
): Promise<Transaction> => {
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

  if (
    useInvalidatorData?.parsed.maxUsages &&
    useInvalidatorData?.parsed.usages
      .add(new BN(usages))
      .gte(useInvalidatorData?.parsed.maxUsages)
  ) {
    const tokenManagerTokenAccountId =
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        mintId,
        tokenManagerId,
        wallet.publicKey,
        true
      );

    const remainingAccountsForReturn = await withRemainingAccountsForReturn(
      transaction,
      connection,
      wallet,
      tokenManagerData?.parsed.issuer,
      mintId,
      tokenManagerData?.parsed.invalidationType
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

    transaction.add(
      await useInvalidator.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        remainingAccountsForReturn,
        issuerPaymentMintTokenAccountId,
        tokenManagerData.parsed.paymentMint
      )
    );
  }
  return transaction;
};
