import { BN } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { SPLToken } from "@saberhq/token-utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import {
  claimApprover,
  paymentManager,
  timeInvalidator,
  tokenManager,
} from "./programs";
import { TokenManagerKind } from "./programs/tokenManager";
import { withFindOrInitAssociatedTokenAccount } from "./utils";

export const createRental = async (
  connection: Connection,
  wallet: Wallet,
  {
    paymentAmount,
    paymentMint,
    expiration,
    rentalMint,
    issuerTokenAccountId,
    amount = new BN(1),
    kind = TokenManagerKind.Managed,
  }: {
    paymentAmount: number;
    paymentMint: PublicKey;
    expiration: number;
    rentalMint: PublicKey;
    issuerTokenAccountId: PublicKey;
    amount?: BN;
    kind?: TokenManagerKind;
  }
): Promise<[Transaction, PublicKey]> => {
  const transaction = new Transaction();

  // init token manager
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    rentalMint
  );
  transaction.add(tokenManagerIx);

  // init payment manager
  const [paymentManagerIx, paymentManagerId] =
    await paymentManager.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      paymentMint
    );
  transaction.add(paymentManagerIx);

  // set payment manager
  transaction.add(
    tokenManager.instruction.setPaymetManager(
      connection,
      wallet,
      tokenManagerId,
      paymentManagerId
    )
  );

  // init claim approver
  const [claimApproverIx, claimApproverId] =
    await claimApprover.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      paymentManagerId,
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

  transaction.add(
    SPLToken.createSetAuthorityInstruction(
      TOKEN_PROGRAM_ID,
      rentalMint,
      tokenManagerId,
      "FreezeAccount",
      wallet.publicKey,
      []
    )
  );

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
      rentalMint,
      tokenManagerTokenAccountId,
      issuerTokenAccountId,
      kind
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
    tokenManagerData.parsed.paymentManager
  ) {
    const paymentManagerData = await paymentManager.accounts.getPaymentManager(
      connection,
      tokenManagerData.parsed.paymentManager
    );

    const paymentManagerTokenAccountId =
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        paymentManagerData.parsed.paymentMint,
        tokenManagerData.parsed.paymentManager,
        wallet.publicKey,
        true
      );

    const payerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      paymentManagerData.parsed.paymentMint,
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
        tokenManagerData.parsed.paymentManager,
        paymentManagerTokenAccountId,
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
    tokenManager.instruction.claim(
      connection,
      wallet,
      tokenManagerId,
      tokenManagerData.parsed.mint,
      tokenManagerTokenAccountId,
      recipientTokenAccountId,
      claimReceiptId
    )
  );

  return transaction;
};
