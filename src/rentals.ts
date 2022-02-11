import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";

import {
  claimApprover,
  receiptIndex,
  timeInvalidator,
  tokenManager,
  useInvalidator,
} from "./programs";
import { InvalidationType, TokenManagerKind } from "./programs/tokenManager";
import { tryGetAccount, withFindOrInitAssociatedTokenAccount } from "./utils";

/**
 * Main method for creating any kind of rental
 * Allows for optional payment, optional usages or expiration and includes a otp for private links
 * @param connection
 * @param wallet
 * @param param2
 * @returns Transaction, public key for the created token manager and a otp if necessary for private links
 */
export const createRental = async (
  connection: Connection,
  wallet: Wallet,
  {
    paymentAmount,
    paymentMint,
    expiration,
    usages,
    rentalMint,
    issuerTokenAccountId,
    amount = new BN(1),
    kind = TokenManagerKind.Managed,
    invalidationType = InvalidationType.Return,
    visibility = "public",
    index = false,
  }: {
    paymentAmount?: number;
    paymentMint?: PublicKey;
    expiration?: number;
    usages?: number;
    rentalMint: PublicKey;
    issuerTokenAccountId: PublicKey;
    amount?: BN;
    visibility?: "private" | "public";
    kind?: TokenManagerKind;
    invalidationType?: InvalidationType;
    index?: boolean;
  }
): Promise<[Transaction, PublicKey, Keypair | undefined]> => {
  const transaction = new Transaction();

  // init token manager
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    rentalMint,
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
      await tokenManager.instruction.creatMintManager(
        connection,
        wallet,
        rentalMint
      );

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
    rentalMint,
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
  if (index) {
    const receiptCounterData = await tryGetAccount(() =>
      receiptIndex.accounts.getReceiptCounter(connection, wallet.publicKey)
    );

    if (!receiptCounterData) {
      const [receiptCounterInitIx] = await receiptIndex.instruction.init(
        connection,
        wallet,
        wallet.publicKey
      );
      transaction.add(receiptCounterInitIx);
    }

    transaction.add(
      await receiptIndex.instruction.add(
        connection,
        wallet,
        wallet.publicKey,
        tokenManagerId,
        receiptCounterData?.parsed.count.add(new BN(1)) || new BN(0)
      )
    );
  }

  return [transaction, tokenManagerId, otp];
};

export const claimRental = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey
): Promise<Transaction> => {
  const transaction = new Transaction();

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
