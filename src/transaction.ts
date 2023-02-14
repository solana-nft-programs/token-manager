import type { AccountData } from "@cardinal/common";
import {
  decodeIdlAccount,
  fetchAccountDataById,
  findAta,
  findMintMetadataId,
  getBatchedMultipleAccounts,
  METADATA_PROGRAM_ID,
  tryDecodeIdlAccount,
  tryGetAccount,
  tryNull,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import {
  findMintManagerId as findCCSMintManagerId,
  findRulesetId,
  PROGRAM_ADDRESS,
} from "@cardinal/creator-standard";
import { PAYMENT_MANAGER_ADDRESS } from "@cardinal/payment-manager";
import { withRemainingAccountsForPayment } from "@cardinal/payment-manager/dist/cjs/utils";
import {
  Metadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN } from "@project-serum/anchor";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";
import {
  ComputeBudgetProgram,
  Keypair,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";

import type { CardinalTokenManager } from "./idl/cardinal_token_manager";
import { timeInvalidator, tokenManager, useInvalidator } from "./programs";
import type {
  CLAIM_APPROVER_PROGRAM,
  ClaimApproverParams,
} from "./programs/claimApprover";
import {
  CLAIM_APPROVER_IDL,
  claimApproverProgram,
  defaultPaymentManagerId,
} from "./programs/claimApprover";
import { findClaimApproverAddress } from "./programs/claimApprover/pda";
import type { TimeInvalidationParams } from "./programs/timeInvalidator";
import { timeInvalidatorProgram } from "./programs/timeInvalidator";
import { findTimeInvalidatorAddress } from "./programs/timeInvalidator/pda";
import { shouldTimeInvalidate } from "./programs/timeInvalidator/utils";
import type {
  TOKEN_MANAGER_PROGRAM,
  TokenManagerData,
} from "./programs/tokenManager";
import {
  CRANK_KEY,
  InvalidationType,
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_IDL,
  TokenManagerKind,
  tokenManagerProgram,
  TokenManagerState,
} from "./programs/tokenManager";
import { getTokenManager } from "./programs/tokenManager/accounts";
import {
  findMintCounterId,
  findMintManagerId,
  findReceiptMintManagerId,
  findTokenManagerAddress,
  tokenManagerAddressFromMint,
} from "./programs/tokenManager/pda";
import {
  getRemainingAccountsForClaim,
  getRemainingAccountsForIssue,
  getRemainingAccountsForKind,
  getRemainingAccountsForTransfer,
  getRemainingAccountsForUnissue,
  withRemainingAccountsForInvalidate,
  withRemainingAccountsForReturn,
} from "./programs/tokenManager/utils";
import {
  getListing,
  getTransferAuthorityByName,
} from "./programs/transferAuthority/accounts";
import { findListingAddress } from "./programs/transferAuthority/pda";
import type { UseInvalidationParams } from "./programs/useInvalidator";
import { useInvalidatorProgram } from "./programs/useInvalidator";
import { findUseInvalidatorAddress } from "./programs/useInvalidator/pda";

export type IssueParameters = {
  claimPayment?: ClaimApproverParams;
  timeInvalidation?: TimeInvalidationParams;
  useInvalidation?: UseInvalidationParams;
  transferAuthorityInfo?: {
    transferAuthorityName: string;
    creator?: PublicKey;
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
  rulesetId?: PublicKey;
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
    rulesetId = undefined,
  }: IssueParameters,
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey, Keypair | undefined]> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const caProgram = claimApproverProgram(connection, wallet);
  const tmeInvalidatorProgram = timeInvalidatorProgram(connection, wallet);
  const usgInvalidatorProgram = useInvalidatorProgram(connection, wallet);

  // create mint manager
  if (
    kind === TokenManagerKind.Managed ||
    kind === TokenManagerKind.Permissioned
  ) {
    const mintManagerId = findMintManagerId(mint);
    const mintManagerData = await tryGetAccount(() =>
      tokenManager.accounts.getMintManager(connection, mintManagerId)
    );
    if (!mintManagerData) {
      const mintManagerIx = await tmManagerProgram.methods
        .createMintManager()
        .accounts({
          mintManager: mintManagerId,
          mint: mint,
          freezeAuthority: wallet.publicKey,
          payer: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
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
    (transferAuthorityInfo?.creator ? 1 : 0);
  const tokenManagerId = findTokenManagerAddress(mint);
  const mintCounterId = findMintCounterId(mint);
  const tokenManagerIx = await tmManagerProgram.methods
    .init({
      amount: amount,
      kind: kind,
      invalidationType: invalidationType,
      numInvalidators: numInvalidator,
    })
    .accounts({
      tokenManager: tokenManagerId,
      mintCounter: mintCounterId,
      mint: mint,
      issuer: wallet.publicKey,
      payer: wallet.publicKey,
      issuerTokenAccount: issuerTokenAccountId,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
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
    const setTransferAuthorityIx = await tmManagerProgram.methods
      .setTransferAuthority(checkTransferAuthority.pubkey)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      })
      .instruction();

    transaction.add(setTransferAuthorityIx);
    if (transferAuthorityInfo.creator) {
      const adInvalidatorIx = await tmManagerProgram.methods
        .addInvalidator(transferAuthorityInfo.creator)
        .accounts({
          tokenManager: tokenManagerId,
          issuer: wallet.publicKey,
        })
        .instruction();
      transaction.add(adInvalidatorIx);
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
    const paidClaimApproverId = findClaimApproverAddress(tokenManagerId);
    const paidClaimApproverIx = await caProgram.methods
      .init({
        paymentMint: claimPayment.paymentMint,
        paymentAmount: new BN(claimPayment.paymentAmount),
        paymentManager: claimPayment.paymentManager || defaultPaymentManagerId,
        collector: claimPayment.collector || CRANK_KEY,
      })
      .accounts({
        tokenManager: tokenManagerId,
        claimApprover: paidClaimApproverId,
        issuer: wallet.publicKey,
        payer: payer ?? wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(paidClaimApproverIx);
    const setClaimApproverIx = await tmManagerProgram.methods
      .setClaimApprover(paidClaimApproverId)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      })
      .instruction();
    transaction.add(setClaimApproverIx);
  } else if (visibility === "private") {
    otp = Keypair.generate();
    const setClaimApproverIx = await tmManagerProgram.methods
      .setClaimApprover(otp.publicKey)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      })
      .instruction();
    transaction.add(setClaimApproverIx);
  } else if (visibility === "permissioned") {
    if (!permissionedClaimApprover) {
      throw "Claim approver is not specified for permissioned link";
    }
    const setClaimApproverIx = await tmManagerProgram.methods
      .setClaimApprover(permissionedClaimApprover)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      })
      .instruction();
    transaction.add(setClaimApproverIx);
  }

  //////////////////////////////
  /////// time invalidator /////
  //////////////////////////////
  if (timeInvalidation) {
    const timeInvalidatorId = findTimeInvalidatorAddress(tokenManagerId);
    const timeInvalidatorIx = await tmeInvalidatorProgram.methods
      .init({
        collector: timeInvalidation.collector || CRANK_KEY,
        paymentManager:
          timeInvalidation.paymentManager || defaultPaymentManagerId,
        durationSeconds:
          timeInvalidation.durationSeconds !== undefined
            ? new BN(timeInvalidation.durationSeconds)
            : null,
        extensionPaymentAmount:
          timeInvalidation.extension?.extensionPaymentAmount !== undefined
            ? new BN(timeInvalidation.extension?.extensionPaymentAmount)
            : null,
        extensionDurationSeconds:
          timeInvalidation.extension?.extensionDurationSeconds !== undefined
            ? new BN(timeInvalidation.extension?.extensionDurationSeconds)
            : null,
        extensionPaymentMint:
          timeInvalidation.extension?.extensionPaymentMint || null,
        maxExpiration:
          timeInvalidation.maxExpiration !== undefined
            ? new BN(timeInvalidation.maxExpiration)
            : null,
        disablePartialExtension:
          timeInvalidation.extension?.disablePartialExtension || null,
      })
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
        issuer: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(timeInvalidatorIx);
    const addInvalidatorIx = await tmManagerProgram.methods
      .addInvalidator(timeInvalidatorId)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      })
      .instruction();
    transaction.add(addInvalidatorIx);
  } else {
    const timeInvalidatorId = findTimeInvalidatorAddress(tokenManagerId);
    const timeInvalidatorData = await tryGetAccount(() =>
      timeInvalidator.accounts.getTimeInvalidator(connection, timeInvalidatorId)
    );
    if (timeInvalidatorData) {
      const closeIx = await tmeInvalidatorProgram.methods
        .close()
        .accounts({
          tokenManager: tokenManagerId,
          timeInvalidator: timeInvalidatorId,
          collector: timeInvalidatorData.parsed.collector,
          closer: wallet.publicKey,
        })
        .instruction();
      transaction.add(closeIx);
    }
  }

  //////////////////////////////
  /////////// usages ///////////
  //////////////////////////////
  if (useInvalidation) {
    const useInvalidatorId = findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorIx = await usgInvalidatorProgram.methods
      .init({
        collector: useInvalidation.collector || CRANK_KEY,
        paymentManager:
          useInvalidation.paymentManager || defaultPaymentManagerId,
        totalUsages: useInvalidation.totalUsages
          ? new BN(useInvalidation.totalUsages)
          : null,
        maxUsages: useInvalidation.extension?.maxUsages
          ? new BN(useInvalidation.extension?.maxUsages)
          : null,
        useAuthority: useInvalidation.useAuthority || null,
        extensionPaymentAmount: useInvalidation.extension
          ?.extensionPaymentAmount
          ? new BN(useInvalidation.extension?.extensionPaymentAmount)
          : null,
        extensionPaymentMint:
          useInvalidation.extension?.extensionPaymentMint || null,
        extensionUsages: useInvalidation.extension?.extensionUsages
          ? new BN(useInvalidation.extension.extensionUsages)
          : null,
      })
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        issuer: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(useInvalidatorIx);
    const addInvalidatorIx = await tmManagerProgram.methods
      .addInvalidator(useInvalidatorId)
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      })
      .instruction();
    transaction.add(addInvalidatorIx);
  } else {
    const useInvalidatorId =
      useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
    const useInvalidatorData = await tryGetAccount(() =>
      useInvalidator.accounts.getUseInvalidator(connection, useInvalidatorId)
    );
    if (useInvalidatorData) {
      const closeIx = await usgInvalidatorProgram.methods
        .close()
        .accounts({
          tokenManager: tokenManagerId,
          useInvalidator: useInvalidatorId,
          collector: useInvalidatorData.parsed.collector,
          closer: wallet.publicKey,
        })
        .instruction();
      transaction.add(closeIx);
    }
  }

  /////////////////////////////////////////
  //////////// custom invalidators ////////
  /////////////////////////////////////////
  if (customInvalidators) {
    for (const invalidator of customInvalidators) {
      const addInvalidatorIx = await tmManagerProgram.methods
        .addInvalidator(invalidator)
        .accounts({
          tokenManager: tokenManagerId,
          issuer: wallet.publicKey,
        })
        .instruction();
      transaction.add(addInvalidatorIx);
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

  const issueIx = await tmManagerProgram.methods
    .issue()
    .accounts({
      tokenManager: tokenManagerId,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      issuer: wallet.publicKey,
      issuerTokenAccount: issuerTokenAccountId,
      payer: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      getRemainingAccountsForIssue(
        kind,
        mint,
        issuerTokenAccountId,
        tokenManagerTokenAccountId,
        rulesetId
      )
    )
    .instruction();
  transaction.add(issueIx);

  //////////////////////////////
  //////////// index ///////////
  //////////////////////////////
  if (receiptOptions) {
    const { receiptMintKeypair } = receiptOptions;
    const receiptMintMetadataId = findMintMetadataId(
      receiptMintKeypair.publicKey
    );
    const recipientTokenAccountId = await findAta(
      receiptMintKeypair.publicKey,
      wallet.publicKey
    );
    const receiptManagerId = findReceiptMintManagerId();
    const claimReceiptMintIx = await tmManagerProgram.methods
      .claimReceiptMint("receipt")
      .accounts({
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
        receiptMint: receiptMintKeypair.publicKey,
        receiptMintMetadata: receiptMintMetadataId,
        recipientTokenAccount: recipientTokenAccountId,
        receiptMintManager: receiptManagerId,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedToken: ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();
    transaction.add(claimReceiptMintIx);
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
  const claimApproverId = findClaimApproverAddress(tokenManagerId);
  const accountData = await fetchAccountDataById(connection, [
    tokenManagerId,
    claimApproverId,
  ]);
  const tokenManagerInfo = accountData[tokenManagerId.toString()];
  if (!tokenManagerInfo?.data) throw "Token manager not found";
  const tokenManagerData = decodeIdlAccount<
    "tokenManager",
    TOKEN_MANAGER_PROGRAM
  >(tokenManagerInfo, "tokenManager", TOKEN_MANAGER_IDL);

  const claimApproverInfo = accountData[claimApproverId.toString()];
  const claimApproverData = claimApproverInfo
    ? tryDecodeIdlAccount<"paidClaimApprover", CLAIM_APPROVER_PROGRAM>(
        claimApproverInfo,
        "paidClaimApprover",
        CLAIM_APPROVER_IDL
      )
    : null;

  const metadataId = findMintMetadataId(tokenManagerData.parsed.mint);
  const metadata = await tryNull(
    Metadata.fromAccountAddress(connection, metadataId)
  );

  const claimReceiptId = tokenManager.pda.findClaimReceiptId(
    tokenManagerId,
    wallet.publicKey
  );
  // pay claim approver
  if (
    claimApproverData?.parsed &&
    tokenManagerData.parsed.claimApprover &&
    tokenManagerData.parsed.claimApprover.toString() ===
      claimApproverId.toString()
  ) {
    const payerTokenAccountId = getAssociatedTokenAddressSync(
      claimApproverData.parsed.paymentMint,
      wallet.publicKey
    );

    const [
      issuerTokenAccountId,
      feeCollectorTokenAccountId,
      remainingAccounts,
    ] = await withRemainingAccountsForPayment(
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

    const payIx = await claimApproverProgram(connection, wallet)
      .methods.pay()
      .accounts({
        tokenManager: tokenManagerId,
        paymentTokenAccount: issuerTokenAccountId,
        feeCollectorTokenAccount: feeCollectorTokenAccountId,
        paymentManager: claimApproverData.parsed.paymentManager,
        claimApprover: claimApproverId,
        payer: wallet.publicKey,
        payerTokenAccount: payerTokenAccountId,
        claimReceipt: claimReceiptId,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    transaction.add(payIx);
  } else if (tokenManagerData.parsed.claimApprover) {
    const createClaimReceiptIx = await tokenManagerProgram(connection, wallet)
      .methods.createClaimReceipt(wallet.publicKey)
      .accountsStrict({
        tokenManager: tokenManagerId,
        claimApprover: tokenManagerData.parsed.claimApprover,
        claimReceipt: claimReceiptId,
        payer: additionalOptions?.payer || wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(createClaimReceiptIx);
  }

  const tokenManagerTokenAccountId = getAssociatedTokenAddressSync(
    tokenManagerData.parsed.mint,
    tokenManagerId,
    true
  );
  const recipientTokenAccountId = getAssociatedTokenAddressSync(
    tokenManagerData.parsed.mint,
    wallet.publicKey
  );
  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      additionalOptions?.payer ?? wallet.publicKey,
      recipientTokenAccountId,
      wallet.publicKey,
      tokenManagerData.parsed.mint
    )
  );
  // claim
  const claimIx = await tokenManagerProgram(connection, wallet)
    .methods.claim()
    .accounts({
      tokenManager: tokenManagerId,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      mint: tokenManagerData.parsed.mint,
      recipient: wallet.publicKey,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      getRemainingAccountsForClaim(
        { parsed: tokenManagerData.parsed, pubkey: tokenManagerId },
        recipientTokenAccountId,
        metadata,
        claimReceiptId
      )
    )
    .instruction();
  transaction.add(claimIx);
  return transaction;
};

export const withUnissueToken = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
  const tokenManagerId = tokenManagerAddressFromMint(mintId);
  const [tokenManagerInfo, metadataInfo] = await getBatchedMultipleAccounts(
    connection,
    [tokenManagerId, findMintMetadataId(mintId)]
  );

  const metadata = metadataInfo
    ? Metadata.deserialize(metadataInfo.data)[0]
    : null;
  if (!tokenManagerInfo) throw "Token manager not found";
  const tokenManager = decodeIdlAccount<"tokenManager", CardinalTokenManager>(
    tokenManagerInfo,
    "tokenManager",
    TOKEN_MANAGER_IDL
  );

  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(
      wallet.publicKey,
      getAssociatedTokenAddressSync(mintId, wallet.publicKey),
      wallet.publicKey,
      mintId
    )
  );
  transaction.add(
    await tokenManagerProgram(connection, wallet)
      .methods.unissue()
      .accounts({
        tokenManager: tokenManagerId,
        tokenManagerTokenAccount: getAssociatedTokenAddressSync(
          mintId,
          tokenManagerId,
          true
        ),
        issuer: wallet.publicKey,
        issuerTokenAccount: getAssociatedTokenAddressSync(
          mintId,
          wallet.publicKey
        ),
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(
        getRemainingAccountsForUnissue(
          tokenManagerId,
          tokenManager.parsed,
          metadata
        )
      )
      .instruction()
  );
  return transaction;
};

export const withInvalidate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  UTCNow: number = Date.now() / 1000
): Promise<Transaction> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const tmeInvalidatorProgram = timeInvalidatorProgram(connection, wallet);
  const usgInvalidatorProgram = useInvalidatorProgram(connection, wallet);

  const tokenManagerId = tokenManagerAddressFromMint(mintId);
  const useInvalidatorId =
    useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
  const timeInvalidatorId =
    timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);

  const [useInvalidatorData, timeInvalidatorData, tokenManagerData, metadata] =
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
      tryNull(
        Metadata.fromAccountAddress(connection, findMintMetadataId(mintId))
      ),
    ]);

  if (!tokenManagerData) return transaction;
  if (
    tokenManagerData.parsed.kind === TokenManagerKind.Programmable ||
    metadata?.tokenStandard === TokenStandard.ProgrammableNonFungible
  ) {
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: 400000,
      })
    );
  }

  const recipientTokenAccount = await getAccount(
    connection,
    tokenManagerData.parsed.recipientTokenAccount
  );

  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    tokenManagerId,
    wallet.publicKey,
    true
  );

  const remainingAccounts = await withRemainingAccountsForInvalidate(
    transaction,
    connection,
    wallet,
    mintId,
    tokenManagerData,
    recipientTokenAccount.owner,
    metadata
  );
  if (
    useInvalidatorData &&
    useInvalidatorData.parsed.totalUsages &&
    useInvalidatorData.parsed.usages.gte(useInvalidatorData.parsed.totalUsages)
  ) {
    const invalidateIx = await usgInvalidatorProgram.methods
      .invalidate()
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        invalidator: wallet.publicKey,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        mint: mintId,
        recipientTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    transaction.add(invalidateIx);
    const closeIx = await usgInvalidatorProgram.methods
      .close()
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        collector: useInvalidatorData.parsed.collector,
        closer: wallet.publicKey,
      })
      .instruction();
    transaction.add(closeIx);
  } else if (
    timeInvalidatorData &&
    shouldTimeInvalidate(tokenManagerData, timeInvalidatorData, UTCNow)
  ) {
    const invalidateIx = await tmeInvalidatorProgram.methods
      .invalidate()
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
        invalidator: wallet.publicKey,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        mint: mintId,
        recipientTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    transaction.add(invalidateIx);
    const closeIx = await tmeInvalidatorProgram.methods
      .close()
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
        collector: timeInvalidatorData.parsed.collector,
        closer: wallet.publicKey,
      })
      .instruction();
    transaction.add(closeIx);
  } else if (
    tokenManagerData.parsed.invalidators.some((inv) =>
      inv.equals(wallet.publicKey)
    ) ||
    tokenManagerData.parsed.invalidationType === InvalidationType.Return ||
    tokenManagerData.parsed.invalidationType === InvalidationType.Reissue
  ) {
    const invalidateIx = await tmManagerProgram.methods
      .invalidate()
      .accounts({
        tokenManager: tokenManagerId,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        mint: mintId,
        recipientTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
        invalidator: wallet.publicKey,
        collector: CRANK_KEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    transaction.add(invalidateIx);
  }
  return transaction;
};

export const withReturn = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerData: AccountData<TokenManagerData>
): Promise<Transaction> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
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
      recipientTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
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
  const tokenManagerId = tokenManagerAddressFromMint(mintId);
  const usgInvalidatorProgram = useInvalidatorProgram(connection, wallet);

  const useInvalidatorId =
    useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);

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
    const initIx = await usgInvalidatorProgram.methods
      .init({
        collector: collector ?? CRANK_KEY,
        paymentManager: defaultPaymentManagerId,
        totalUsages: null,
        maxUsages: null,
        useAuthority: null,
        extensionPaymentAmount: null,
        extensionPaymentMint: null,
        extensionUsages: null,
      })
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        issuer: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .instruction();
    transaction.add(initIx);
  }

  if (!tokenManagerData?.parsed.recipientTokenAccount)
    throw new Error("Token manager has not been claimed");

  // use
  const incrementUsagesIx = await usgInvalidatorProgram.methods
    .incrementUsages(new BN(usages))
    .accounts({
      tokenManager: tokenManagerId,
      useInvalidator: useInvalidatorId,
      recipientTokenAccount: tokenManagerData?.parsed.recipientTokenAccount,
      user: wallet.publicKey,
    })
    .instruction();
  transaction.add(incrementUsagesIx);

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

    const remainingAccountsForKind = getRemainingAccountsForKind(
      mintId,
      tokenManagerData.parsed.kind
    );
    const invalidateIx = await usgInvalidatorProgram.methods
      .invalidate()
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        invalidator: wallet.publicKey,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        mint: mintId,
        recipientTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .remainingAccounts([
        ...remainingAccountsForKind,
        ...remainingAccountsForReturn,
      ])
      .instruction();
    transaction.add(invalidateIx);

    const closeIx = await usgInvalidatorProgram.methods
      .close()
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        collector: useInvalidatorData.parsed.collector,
        closer: wallet.publicKey,
      })
      .instruction();
    transaction.add(closeIx);
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
  const tmeInvalidatorProgram = timeInvalidatorProgram(connection, wallet);
  const timeInvalidatorId =
    timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
  const [timeInvalidatorData, tokenManagerData] = await Promise.all([
    timeInvalidator.accounts.getTimeInvalidator(connection, timeInvalidatorId),
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (timeInvalidatorData && timeInvalidatorData.parsed.extensionPaymentMint) {
    const payerTokenAccountId = await findAta(
      timeInvalidatorData.parsed.extensionPaymentMint,
      wallet.publicKey
    );

    const [
      paymentTokenAccountId,
      feeCollectorTokenAccountId,
      remainingAccounts,
    ] = await withRemainingAccountsForPayment(
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

    const extendExpirationIx = await tmeInvalidatorProgram.methods
      .extendExpiration(new BN(secondsToAdd))
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
        paymentManager: timeInvalidatorData.parsed.paymentManager,
        paymentTokenAccount: paymentTokenAccountId,
        feeCollectorTokenAccount: feeCollectorTokenAccountId,
        payer: wallet.publicKey,
        payerTokenAccount: payerTokenAccountId,
        tokenProgram: TOKEN_PROGRAM_ID,
        cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    transaction.add(extendExpirationIx);
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
  const usgInvalidatorProgram = useInvalidatorProgram(connection, wallet);
  const useInvalidatorId =
    useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId);
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

    const [
      paymentTokenAccountId,
      feeCollectorTokenAccountId,
      remainingAccounts,
    ] = await withRemainingAccountsForPayment(
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

    const extendUsagesIx = await usgInvalidatorProgram.methods
      .extendUsages(new BN(usagesToAdd))
      .accounts({
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        paymentManager: useInvalidatorData.parsed.paymentManager,
        paymentTokenAccount: paymentTokenAccountId,
        feeCollectorTokenAccount: feeCollectorTokenAccountId,
        payer: wallet.publicKey,
        payerTokenAccount: payerTokenAccountId,
        tokenProgram: TOKEN_PROGRAM_ID,
        cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
    transaction.add(extendUsagesIx);
  }

  return transaction;
};

export const withResetExpiration = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey
): Promise<Transaction> => {
  const tmeInvalidatorProgram = timeInvalidatorProgram(connection, wallet);
  const timeInvalidatorId =
    timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
  const [tokenManagerData] = await Promise.all([
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (tokenManagerData.parsed.state === TokenManagerState.Issued) {
    const resetExpirationIx = await tmeInvalidatorProgram.methods
      .resetExpiration()
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
      })
      .instruction();
    transaction.add(resetExpirationIx);
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
  const tmeInvalidatorProgram = timeInvalidatorProgram(connection, wallet);
  const timeInvalidatorId =
    timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId);
  const [tokenManagerData] = await Promise.all([
    tokenManager.accounts.getTokenManager(connection, tokenManagerId),
  ]);

  if (tokenManagerData.parsed.state !== TokenManagerState.Invalidated) {
    const updateExpirationIx = await tmeInvalidatorProgram.methods
      .updateMaxExpiration({
        newMaxExpiration: newMaxExpiration,
      })
      .accounts({
        tokenManager: tokenManagerId,
        timeInvalidator: timeInvalidatorId,
        issuer: wallet.publicKey,
      })
      .instruction();
    transaction.add(updateExpirationIx);
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
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const tokenManagerId = findTokenManagerAddress(mintId);
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

  const remainingAccountsForKind = getRemainingAccountsForKind(
    mintId,
    tokenManagerData.parsed.kind
  );

  const remainingAccountsForTransfer = getRemainingAccountsForTransfer(
    tokenManagerData.parsed.transferAuthority,
    tokenManagerId
  );

  const transferIx = await tmManagerProgram.methods
    .transfer()
    .accounts({
      tokenManager: tokenManagerId,
      mint: mintId,
      currentHolderTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
      recipient: recipient,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts([
      ...remainingAccountsForKind,
      ...remainingAccountsForTransfer,
    ])
    .instruction();
  transaction.add(transferIx);

  return transaction;
};

export const withDelegate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  recipient = wallet.publicKey
): Promise<Transaction> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }
  const mintManagerId = findMintManagerId(mintId);

  const delegateIx = await tmManagerProgram.methods
    .delegate()
    .accounts({
      tokenManager: tokenManagerId,
      mint: mintId,
      mintManager: mintManagerId,
      recipient: recipient,
      recipientTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  transaction.add(delegateIx);

  return transaction;
};

export const withUndelegate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  recipient?: PublicKey
): Promise<Transaction> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }
  const mintManagerId = findMintManagerId(mintId);

  const recipientTokenAccountId = await findAta(
    mintId,
    recipient ?? wallet.publicKey,
    true
  );

  const undelegateIx = await tmManagerProgram.methods
    .undelegate()
    .accounts({
      tokenManager: tokenManagerId,
      mint: mintId,
      mintManager: mintManagerId,
      recipient: recipient,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  transaction.add(undelegateIx);

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
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw "No token manager found";
  }
  const mintManagerId = findMintManagerId(mintId);
  const listingId = findListingAddress(mintId);
  const checkListing = await tryGetAccount(() =>
    getListing(connection, listingId)
  );
  if (checkListing) {
    throw "Token is already listed. You need to delist the token first before sending it.";
  }

  const targetTokenAccountId = await findAta(mintId, target, true);
  const sendIx = await tmManagerProgram.methods
    .send()
    .accounts({
      tokenManager: tokenManagerId,
      mint: mintId,
      mintManager: mintManagerId,
      recipient: wallet.publicKey,
      recipientTokenAccount: senderTokenAccountId,
      target: target,
      targetTokenAccount: targetTokenAccountId,
      payer: wallet.publicKey,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .instruction();
  transaction.add(sendIx);
  return transaction;
};

export const withMigrate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  rulesetName: string,
  holderTokenAccountId: PublicKey,
  authority: PublicKey
): Promise<Transaction> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const currentMintManagerId = findMintManagerId(mintId);
  const mintManagerId = findCCSMintManagerId(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const rulesetId = findRulesetId(rulesetName);
  const mintMetadataId = findMintMetadataId(mintId);

  const migrateIx = await tmManagerProgram.methods
    .migrate()
    .accountsStrict({
      currentMintManager: currentMintManagerId,
      mintManager: mintManagerId,
      mint: mintId,
      mintMetadata: mintMetadataId,
      ruleset: rulesetId,
      tokenManager: tokenManagerId,
      holderTokenAccount: holderTokenAccountId,
      tokenAuthority: currentMintManagerId,
      authority: authority,
      payer: wallet.publicKey,
      rent: SYSVAR_RENT_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      cardinalCreatorStandard: PROGRAM_ADDRESS,
    })
    .instruction();
  transaction.add(migrateIx);

  return transaction;
};
