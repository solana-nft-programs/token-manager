import { withRemainingAccountsForPayment } from "@cardinal/payment-manager/dist/cjs/utils";
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
import { shouldTimeInvalidate } from "./programs/timeInvalidator/utils";
import type { TokenManagerData } from "./programs/tokenManager";
import {
  CRANK_KEY,
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "./programs/tokenManager";
import { getTokenManager } from "./programs/tokenManager/accounts";
import { setTransferAuthority } from "./programs/tokenManager/instruction";
import {
  findMintManagerId,
  findTokenManagerAddress,
  tokenManagerAddressFromMint,
} from "./programs/tokenManager/pda";
import {
  getRemainingAccountsForKind,
  getRemainingAccountsForTransfer,
  withRemainingAccountsForReturn,
} from "./programs/tokenManager/utils";
import {
  getListing,
  getTransferAuthorityByName,
} from "./programs/transferAuthority/accounts";
import { findListingAddress } from "./programs/transferAuthority/pda";
import type { UseInvalidationParams } from "./programs/useInvalidator/instruction";
import type { AccountData } from "./utils";
import { tryGetAccount, withFindOrInitAssociatedTokenAccount } from "./utils";

export type IssueParameters = {
  claimPayment?: ClaimApproverParams;
  timeInvalidation?: TimeInvalidationParams;
  useInvalidation?: UseInvalidationParams;
  transferAuthorityInfo?: {
    transferAuthorityName: string;
    setInvalidator?: boolean;
  };
  mint: PublicKey;
  amount?: BN;
  issuerTokenAccountId: PublicKey;
  visibility?: "private" | "public" | "permissioned";
  permissionedClaimApprover?: PublicKey;
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
    issuerTokenAccountId,
    amount = new BN(1),
    transferAuthorityInfo,
    kind = TokenManagerKind.Managed,
    invalidationType = InvalidationType.Return,
    visibility = "public",
    permissionedClaimApprover,
    receiptOptions = undefined,
    customInvalidators = undefined,
  }: IssueParameters,
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey, Keypair | undefined]> => {
  // create mint manager
  if (
    kind === TokenManagerKind.Managed ||
    kind === TokenManagerKind.Permissioned
  ) {
    const [mintManagerIx, mintManagerId] =
      await tokenManager.instruction.creatMintManager(
        connection,
        wallet,
        mint,
        payer
      );

    const mintManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getMintManager(connection, mintManagerId)
    );
    if (!mintManagerData) {
      transaction.add(mintManagerIx);
    }
  }

  // init token manager
  const numInvalidator =
    (customInvalidators ? customInvalidators.length : 0) +
    (useInvalidation && timeInvalidation
      ? 2
      : useInvalidation || timeInvalidation
      ? 1
      : 0) +
    (transferAuthorityInfo?.setInvalidator ? 1 : 0);
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    mint,
    issuerTokenAccountId,
    amount,
    kind,
    invalidationType,
    numInvalidator,
    payer
  );
  transaction.add(tokenManagerIx);

  if (transferAuthorityInfo) {
    const checkTransferAuthority = await tryGetAccount(() =>
      getTransferAuthorityByName(
        connection,
        transferAuthorityInfo.transferAuthorityName
      )
    );
    if (!checkTransferAuthority?.parsed) {
      throw `No transfer authority with name ${transferAuthorityInfo.transferAuthorityName} found`;
    }
    transaction.add(
      setTransferAuthority(
        connection,
        wallet,
        tokenManagerId,
        checkTransferAuthority.pubkey
      )
    );
    if (transferAuthorityInfo.setInvalidator) {
      transaction.add(
        tokenManager.instruction.addInvalidator(
          connection,
          wallet,
          tokenManagerId,
          checkTransferAuthority.pubkey
        )
      );
    }
  }

  //////////////////////////////
  /////// claim approver ///////
  //////////////////////////////
  let otp;
  if (claimPayment) {
    if (visibility !== "public") {
      throw "Paid rentals currently must be public";
    }
    const [paidClaimApproverIx, paidClaimApproverId] =
      await claimApprover.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        claimPayment,
        payer
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
  } else if (visibility === "permissioned") {
    if (!permissionedClaimApprover) {
      throw "Claim approver is not specified for permissioned link";
    }
    transaction.add(
      tokenManager.instruction.setClaimApprover(
        connection,
        wallet,
        tokenManagerId,
        permissionedClaimApprover
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
        timeInvalidation,
        payer
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
        useInvalidation,
        payer
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

  // issuer
  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mint,
    tokenManagerId,
    payer,
    true
  );

  transaction.add(
    tokenManager.instruction.issue(
      connection,
      wallet,
      tokenManagerId,
      tokenManagerTokenAccountId,
      issuerTokenAccountId,
      payer,
      kind === TokenManagerKind.Permissioned
        ? [
            {
              pubkey: CRANK_KEY,
              isSigner: false,
              isWritable: true,
            },
          ]
        : []
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
        receiptMintKeypair.publicKey,
        payer
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
    payer?: PublicKey;
  },
  buySideTokenAccountId?: PublicKey
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
      tokenManagerData.parsed.mint,
      claimApproverData.parsed.paymentMint,
      tokenManagerData.parsed.issuer,
      claimApproverData.parsed.paymentManager,
      buySideTokenAccountId,
      {
        receiptMint: tokenManagerData.parsed.receiptMint,
        payer: additionalOptions?.payer,
      }
    );

    transaction.add(
      await claimApprover.instruction.pay(
        connection,
        wallet,
        tokenManagerId,
        payerTokenAccountId,
        claimApproverData.parsed.paymentManager,
        paymentAccounts
      )
    );
  } else if (tokenManagerData.parsed.claimApprover) {
    // approve claim request
    const [createClaimReceiptIx, claimReceipt] =
      await tokenManager.instruction.createClaimReceipt(
        connection,
        wallet,
        tokenManagerId,
        tokenManagerData.parsed.claimApprover,
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
  mintId: PublicKey,
  UTCNow: number = Date.now() / 1000
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
    shouldTimeInvalidate(tokenManagerData, timeInvalidatorData, UTCNow)
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

export const withReturn = async (
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

  transaction.add(
    await tokenManager.instruction.invalidate(
      connection,
      wallet,
      tokenManagerData.parsed.mint,
      tokenManagerData.pubkey,
      tokenManagerData.parsed.kind,
      tokenManagerData.parsed.state,
      tokenManagerTokenAccountId,
      tokenManagerData?.parsed.recipientTokenAccount,
      remainingAccountsForReturn
    )
  );
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
  secondsToAdd: number,
  options?: {
    payer?: PublicKey;
  },
  buySideTokenAccountId?: PublicKey
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
      tokenManagerData.parsed.mint,
      timeInvalidatorData.parsed.extensionPaymentMint,
      tokenManagerData.parsed.issuer,
      timeInvalidatorData.parsed.paymentManager,
      buySideTokenAccountId,
      {
        receiptMint: tokenManagerData.parsed.receiptMint,
        payer: options?.payer,
      }
    );

    transaction.add(
      timeInvalidator.instruction.extendExpiration(
        connection,
        wallet,
        tokenManagerId,
        timeInvalidatorData.parsed.paymentManager,
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
  usagesToAdd: number,
  options?: {
    payer?: PublicKey;
  },
  buySideTokenAccountId?: PublicKey
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
      tokenManagerData.parsed.mint,
      useInvalidatorData.parsed.extensionPaymentMint,
      tokenManagerData.parsed.issuer,
      useInvalidatorData.parsed.paymentManager,
      buySideTokenAccountId,
      {
        receiptMint: tokenManagerData.parsed.receiptMint,
        payer: options?.payer,
      }
    );

    transaction.add(
      useInvalidator.instruction.extendUsages(
        connection,
        wallet,
        tokenManagerId,
        useInvalidatorData.parsed.paymentManager,
        payerTokenAccountId,
        useInvalidatorId,
        usagesToAdd,
        paymentAccounts
      )
    );
  }

  return transaction;
};

export const withResetExpiration = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey
): Promise<Transaction> => {
  const [timeInvalidatorId] =
    await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
  const [tokenManagerData] = await Promise.all([
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (tokenManagerData.parsed.state === TokenManagerState.Issued) {
    transaction.add(
      timeInvalidator.instruction.resetExpiration(
        connection,
        wallet,
        tokenManagerId,
        timeInvalidatorId
      )
    );
  } else {
    console.log("Token Manager not in state issued to reset expiration");
  }

  return transaction;
};

export const withUpdateMaxExpiration = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  newMaxExpiration: BN
): Promise<Transaction> => {
  const [timeInvalidatorId] =
    await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
  const [tokenManagerData] = await Promise.all([
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (tokenManagerData.parsed.state !== TokenManagerState.Invalidated) {
    transaction.add(
      timeInvalidator.instruction.updateMaxExpiration(
        connection,
        wallet,
        timeInvalidatorId,
        tokenManagerId,
        newMaxExpiration
      )
    );
  } else {
    console.log("Token Manager not in state issued to update max expiration");
  }
  return transaction;
};

export const withTransfer = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  recipient = wallet.publicKey
): Promise<Transaction> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }

  const recipientTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    recipient,
    wallet.publicKey,
    true
  );

  const remainingAccountsForKind = await getRemainingAccountsForKind(
    mintId,
    tokenManagerData.parsed.kind
  );

  const remainingAccountsForTransfer = await getRemainingAccountsForTransfer(
    tokenManagerData.parsed.transferAuthority,
    tokenManagerId
  );

  transaction.add(
    tokenManager.instruction.transfer(
      connection,
      wallet,
      tokenManagerId,
      mintId,
      tokenManagerData.parsed.recipientTokenAccount,
      recipient,
      recipientTokenAccountId,
      [...remainingAccountsForKind, ...remainingAccountsForTransfer]
    )
  );

  return transaction;
};

export const withDelegate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  recipient = wallet.publicKey
): Promise<Transaction> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }
  const [mintManagerId] = await findMintManagerId(mintId);

  transaction.add(
    tokenManager.instruction.delegate(
      connection,
      wallet,
      mintId,
      tokenManagerId,
      mintManagerId,
      recipient,
      tokenManagerData.parsed.recipientTokenAccount
    )
  );

  return transaction;
};

export const withUndelegate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  recipient?: PublicKey
): Promise<Transaction> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }
  const [mintManagerId] = await findMintManagerId(mintId);

  const recipientTokenAccountId = await findAta(
    mintId,
    recipient ?? wallet.publicKey,
    true
  );
  transaction.add(
    tokenManager.instruction.undelegate(
      connection,
      wallet,
      mintId,
      tokenManagerId,
      mintManagerId,
      recipient ?? wallet.publicKey,
      recipientTokenAccountId
    )
  );

  return transaction;
};

export const withSend = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  senderTokenAccountId: PublicKey,
  target: PublicKey
): Promise<Transaction> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }
  const [mintManagerId] = await findMintManagerId(mintId);
  const [listingId] = await findListingAddress(mintId);
  const checkListing = await tryGetAccount(() =>
    getListing(connection, listingId)
  );
  if (checkListing) {
    throw "Token is already listed. You need to delist the token first before sending it.";
  }

  const targetTokenAccountId = await findAta(mintId, target, true);
  transaction.add(
    tokenManager.instruction.send(
      connection,
      wallet,
      mintId,
      tokenManagerId,
      mintManagerId,
      wallet.publicKey,
      senderTokenAccountId,
      target,
      targetTokenAccountId
    )
  );
  return transaction;
};
