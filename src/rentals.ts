import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import { tryGetAccount } from ".";
import {
  claimApprover,
  timeInvalidator,
  tokenManager,
  useInvalidator,
} from "./programs";
import { InvalidationType, TokenManagerKind } from "./programs/tokenManager";
import { withInitMintCounter } from "./programs/tokenManager/transaction";
import { withFindOrInitAssociatedTokenAccount } from "./utils";

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
  }: {
    paymentAmount: number;
    paymentMint: PublicKey;
    expiration?: number;
    usages?: number;
    rentalMint: PublicKey;
    issuerTokenAccountId: PublicKey;
    amount?: BN;
    kind?: TokenManagerKind;
  }
): Promise<[Transaction, PublicKey]> => {
  const transaction = new Transaction();

  const [mintCount] = await withInitMintCounter(
    transaction,
    connection,
    wallet,
    rentalMint
  );

  // init token manager
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    rentalMint,
    mintCount,
    issuerTokenAccountId
  );
  transaction.add(tokenManagerIx);

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
  const [claimApproverIx, claimApproverId] =
    await claimApprover.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      paymentAmount
    );
  transaction.add(claimApproverIx);

  transaction.add(
    tokenManager.instruction.setClaimApprover(
      connection,
      wallet,
      tokenManagerId,
      claimApproverId
    )
  );

  // time invalidator
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
  }

  // usages
  if (usages) {
    const [useInvalidatorIx, useInvalidatorId] =
      await useInvalidator.instruction.init(
        connection,
        wallet,
        tokenManagerId,
        usages
      );

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

    transaction.add(useInvalidatorIx);
    transaction.add(
      tokenManager.instruction.addInvalidator(
        connection,
        wallet,
        tokenManagerId,
        useInvalidatorId
      )
    );
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
      InvalidationType.Return
    )
  );

  return [transaction, tokenManagerId];
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
