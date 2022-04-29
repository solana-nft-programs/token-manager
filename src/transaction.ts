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
import type { ClaimApproverParams } from "./programs/claimApprover/instruction";
import type { TimeInvalidationParams } from "./programs/timeInvalidator/instruction";
import { InvalidationType, TokenManagerKind } from "./programs/tokenManager";
import { tokenManagerAddressFromMint } from "./programs/tokenManager/pda";
import {
  withRemainingAccountsForPayment,
  withRemainingAccountsForReturn,
} from "./programs/tokenManager/utils";
import type { UseInvalidationParams } from "./programs/useInvalidator/instruction";
import { tryGetAccount, withFindOrInitAssociatedTokenAccount } from "./utils";

export type IssueParameters = {
  claimPayment?: ClaimApproverParams;
  timeInvalidation?: TimeInvalidationParams;
  useInvalidation?: UseInvalidationParams;
  mint: PublicKey;
  amount?: BN;
  issuerTokenAccountId: PublicKey;
  visibility?: "private" | "public";
  kind?: TokenManagerKind;
  invalidationType?: InvalidationType;
  receiptOptions?: {
    receiptMintKeypair: Keypair;
  };
  customInvalidators?: PublicKey[];
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
    claimPayment,
    timeInvalidation,
    useInvalidation,
    mint,
    amount = new BN(1),
    issuerTokenAccountId,
    kind = TokenManagerKind.Managed,
    invalidationType = InvalidationType.Return,
    visibility = "public",
    receiptOptions = undefined,
    customInvalidators = undefined,
  }: IssueParameters
): Promise<[Transaction, PublicKey, Keypair | undefined]> => {
  // init token manager
  const numInvalidator =
    (customInvalidators ? customInvalidators.length : 0) +
    (useInvalidation && timeInvalidation
      ? 2
      : useInvalidation || timeInvalidation
      ? 1
      : 0);
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    mint,
    issuerTokenAccountId,
    amount,
    kind,
    invalidationType,
    numInvalidator
  );
  transaction.add(tokenManagerIx);

  //////////////////////////////
  /////// claim approver ///////
  //////////////////////////////
  let otp;
  if (claimPayment) {
    if (visibility === "private") {
      throw new Error("Private links do not currently support payment");
    }
    const [paidClaimApproverIx, paidClaimApproverId] =
      await claimApprover.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        claimPayment
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
  if (timeInvalidation) {
    const [timeInvalidatorIx, timeInvalidatorId] =
      await timeInvalidator.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        timeInvalidation
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
          tokenManagerId,
          timeInvalidatorData.parsed.collector
        )
      );
    }
  }

  //////////////////////////////
  /////////// usages ///////////
  //////////////////////////////
  if (useInvalidation) {
    const [useInvalidatorIx, useInvalidatorId] =
      await useInvalidator.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        useInvalidation
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
          tokenManagerId,
          useInvalidatorData.parsed.collector
        )
      );
    }
  }

  /////////////////////////////////////////
  //////////// custom invalidators ////////
  /////////////////////////////////////////
  if (customInvalidators) {
    for (const invalidator of customInvalidators) {
      transaction.add(
        tokenManager.instruction.addInvalidator(
          connection,
          wallet,
          tokenManagerId,
          invalidator
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
      tokenManagerTokenAccountId,
      issuerTokenAccountId
    )
  );

  //////////////////////////////
  //////////// index ///////////
  //////////////////////////////
  if (receiptOptions) {
    const { receiptMintKeypair } = receiptOptions;
    transaction.add(
      await tokenManager.instruction.claimReceiptMint(
        connection,
        wallet,
        "receipt",
        tokenManagerId,
        receiptMintKeypair.publicKey
      )
    );
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
  additionalOptions?: {
    otpKeypair?: Keypair | null;
    payer?: PublicKey;
  }
): Promise<Transaction> => {
  const [tokenManagerData, claimApproverData] = await Promise.all([
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
    tryGetAccount(() =>
      claimApprover.accounts.getClaimApprover(connection, tokenManagerId)
    ),
  ]);

  let claimReceiptId;
  // pay claim approver
  if (
    claimApproverData &&
    tokenManagerData.parsed.claimApprover &&
    tokenManagerData.parsed.claimApprover.toString() ===
      claimApproverData.pubkey.toString()
  ) {
    const payerTokenAccountId = await findAta(
      claimApproverData.parsed.paymentMint,
      wallet.publicKey
    );

    [claimReceiptId] = await tokenManager.pda.findClaimReceiptId(
      tokenManagerId,
      wallet.publicKey
    );

    const paymentAccounts = await withRemainingAccountsForPayment(
      transaction,
      connection,
      wallet,
      claimApproverData.parsed.paymentMint,
      tokenManagerData.parsed.issuer,
      tokenManagerData.parsed.receiptMint,
      claimApproverData.parsed.paymentManager,
      additionalOptions?.payer ?? wallet.publicKey
    );

    transaction.add(
      await claimApprover.instruction.pay(
        connection,
        wallet,
        tokenManagerId,
        payerTokenAccountId,
        paymentAccounts
      )
    );
  } else if (tokenManagerData.parsed.claimApprover) {
    if (
      !additionalOptions?.otpKeypair ||
      additionalOptions?.otpKeypair.publicKey.toString() !==
        tokenManagerData.parsed.claimApprover.toString()
    ) {
      throw new Error("Invalid OTP");
    }
    // approve claim request
    const [createClaimReceiptIx, claimReceipt] =
      await tokenManager.instruction.createClaimReceipt(
        wallet.publicKey,
        tokenManagerId,
        additionalOptions?.otpKeypair.publicKey,
        additionalOptions?.payer
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
    additionalOptions?.payer ?? wallet.publicKey
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
    tokenManagerData
  );

  if (
    useInvalidatorData &&
    useInvalidatorData.parsed.totalUsages &&
    useInvalidatorData.parsed.usages.gte(useInvalidatorData.parsed.totalUsages)
  ) {
    transaction.add(
      await useInvalidator.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerData.parsed.state,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        remainingAccountsForReturn
      )
    );
    transaction.add(
      useInvalidator.instruction.close(
        connection,
        wallet,
        useInvalidatorId,
        tokenManagerId,
        useInvalidatorData.parsed.collector
      )
    );
  } else if (
    timeInvalidatorData &&
    ((timeInvalidatorData.parsed.expiration &&
      timeInvalidatorData.parsed.expiration.lte(new BN(Date.now() / 1000))) ||
      (!timeInvalidatorData.parsed.expiration &&
        timeInvalidatorData.parsed.durationSeconds &&
        tokenManagerData.parsed.stateChangedAt
          .add(timeInvalidatorData.parsed.durationSeconds)
          .lte(new BN(Date.now() / 1000))))
  ) {
    transaction.add(
      await timeInvalidator.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerData.parsed.state,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        remainingAccountsForReturn
      )
    );
    transaction.add(
      timeInvalidator.instruction.close(
        connection,
        wallet,
        timeInvalidatorData.pubkey,
        timeInvalidatorData.parsed.tokenManager,
        timeInvalidatorData.parsed.collector
      )
    );
  } else if (
    tokenManagerData.parsed.invalidators.some((inv) =>
      inv.equals(wallet.publicKey)
    ) ||
    tokenManagerData.parsed.invalidationType === InvalidationType.Return ||
    tokenManagerData.parsed.invalidationType === InvalidationType.Reissue
  ) {
    transaction.add(
      await tokenManager.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerData.parsed.state,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        remainingAccountsForReturn
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
  usages: number,
  collector?: PublicKey
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
      { collector: collector }
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
    useInvalidatorData?.parsed.totalUsages &&
    useInvalidatorData?.parsed.usages
      .add(new BN(usages))
      .gte(useInvalidatorData?.parsed.totalUsages)
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
      tokenManagerData
    );

    transaction.add(
      await useInvalidator.instruction.invalidate(
        connection,
        wallet,
        mintId,
        tokenManagerId,
        tokenManagerData.parsed.kind,
        tokenManagerData.parsed.state,
        tokenManagerTokenAccountId,
        tokenManagerData?.parsed.recipientTokenAccount,
        remainingAccountsForReturn
      )
    );
    transaction.add(
      useInvalidator.instruction.close(
        connection,
        wallet,
        useInvalidatorId,
        tokenManagerId,
        useInvalidatorData.parsed.collector
      )
    );
  }
  return transaction;
};

export const withExtendExpiration = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  secondsToAdd: number
): Promise<Transaction> => {
  const [timeInvalidatorId] =
    await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
  const [timeInvalidatorData, tokenManagerData] = await Promise.all([
    timeInvalidator.accounts.getTimeInvalidator(connection, timeInvalidatorId),
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (timeInvalidatorData && timeInvalidatorData.parsed.extensionPaymentMint) {
    const payerTokenAccountId = await findAta(
      timeInvalidatorData.parsed.extensionPaymentMint,
      wallet.publicKey
    );

    const paymentAccounts = await withRemainingAccountsForPayment(
      transaction,
      connection,
      wallet,
      timeInvalidatorData.parsed.extensionPaymentMint,
      tokenManagerData.parsed.issuer,
      tokenManagerData.parsed.receiptMint,
      timeInvalidatorData.parsed.paymentManager
    );

    transaction.add(
      timeInvalidator.instruction.extendExpiration(
        connection,
        wallet,
        tokenManagerId,
        payerTokenAccountId,
        timeInvalidatorId,
        secondsToAdd,
        paymentAccounts
      )
    );
  } else {
    console.log("No payment mint");
  }

  return transaction;
};

export const withExtendUsages = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentAmount: number
): Promise<Transaction> => {
  const [useInvalidatorId] = await useInvalidator.pda.findUseInvalidatorAddress(
    tokenManagerId
  );
  const [useInvalidatorData, tokenManagerData] = await Promise.all([
    useInvalidator.accounts.getUseInvalidator(connection, useInvalidatorId),
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (useInvalidatorData && useInvalidatorData.parsed.extensionPaymentMint) {
    const payerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      useInvalidatorData.parsed.extensionPaymentMint,
      wallet.publicKey,
      wallet.publicKey
    );

    const paymentAccounts = await withRemainingAccountsForPayment(
      transaction,
      connection,
      wallet,
      useInvalidatorData.parsed.extensionPaymentMint,
      tokenManagerData.parsed.issuer,
      tokenManagerData.parsed.receiptMint,
      useInvalidatorData.parsed.paymentManager
    );

    transaction.add(
      useInvalidator.instruction.extendUsages(
        connection,
        wallet,
        tokenManagerId,
        payerTokenAccountId,
        useInvalidatorId,
        paymentAmount,
        paymentAccounts
      )
    );
  }

  return transaction;
};
