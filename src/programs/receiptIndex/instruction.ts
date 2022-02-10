import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import { findAta } from "../..";
import type { TokenManagerKind } from "../tokenManager";
import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import {
  getRemainingAccountsForKind,
  getRemainingAccountsForPayment,
} from "../tokenManager/utils";
import type { RECEIPT_INDEX_PROGRAM } from "./constants";
import { RECEIPT_INDEX_ADDRESS, RECEIPT_INDEX_IDL } from "./constants";
import {
  findReceiptCounterAddress,
  findReceiptMarkerAddress,
  findReceiptSlotAddress,
} from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  userId: PublicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptCounterId, receiptCounterBump] =
    await findReceiptCounterAddress(userId);

  return [
    rentalCounterProgram.instruction.init(userId, receiptCounterBump, {
      accounts: {
        receiptCounter: receiptCounterId,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }),
    receiptCounterId,
  ];
};

export const add = async (
  connection: Connection,
  wallet: Wallet,
  userId: PublicKey,
  tokenManagerId: PublicKey,
  slotNumber: BN
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptCounterId] = await findReceiptCounterAddress(userId);

  const [receiptSlotId, receiptSlotBump] = await findReceiptSlotAddress(
    userId,
    slotNumber
  );

  const [receiptMarkerId, receiptMarkerBump] = await findReceiptMarkerAddress(
    tokenManagerId
  );

  return rentalCounterProgram.instruction.add(
    userId,
    receiptSlotBump,
    receiptMarkerBump,
    slotNumber,
    {
      accounts: {
        tokenManager: tokenManagerId,
        receiptCounter: receiptCounterId,
        receiptSlot: receiptSlotId,
        receiptMarker: receiptMarkerId,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }
  );
};

export const claim = async (
  connection: Connection,
  wallet: Wallet,
  userId: PublicKey
): Promise<[TransactionInstruction, PublicKey, BN]> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptCounterId, receiptCounterBump] =
    await findReceiptCounterAddress(userId);

  const currentCounter =
    await rentalCounterProgram.account.receiptCounter.fetchNullable(
      receiptCounterId
    );

  return [
    rentalCounterProgram.instruction.init(receiptCounterBump, {
      accounts: {
        receiptCounter: receiptCounterId,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }),
    receiptCounterId,
    currentCounter?.count ?? new BN(0),
  ];
};

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  tokenManagerId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  recipientTokenAccountId: PublicKey,
  issuerPaymentMintTokenAccountId?: PublicKey | null,
  tokenManagerPaymentMint?: PublicKey | null
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptMarkerId] = await findReceiptMarkerAddress(tokenManagerId);

  const tokenManagerTokenAccountId = await findAta(
    mintId,
    tokenManagerId,
    true
  );

  const receiptMarkerTokenAccountId = await findAta(
    mintId,
    receiptMarkerId,
    true
  );

  const [paymentAccounts, transferAccounts] = await Promise.all([
    getRemainingAccountsForPayment(
      tokenManagerId,
      issuerPaymentMintTokenAccountId,
      tokenManagerPaymentMint
    ),
    getRemainingAccountsForKind(mintId, tokenManagerKind),
  ]);

  return rentalCounterProgram.instruction.invalidate({
    accounts: {
      tokenManager: tokenManagerId,
      receiptMarker: receiptMarkerId,
      user: wallet.publicKey,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      receiptTokenManagerTokenAccount: tokenManagerTokenAccountId,
      receiptMarkerTokenAccount: receiptMarkerTokenAccountId,
      receiptMint: mintId,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    remainingAccounts: [...paymentAccounts, ...transferAccounts],
  });
};

export const remove = async (
  connection: Connection,
  wallet: Wallet,
  userId: PublicKey,
  tokenManagerId: PublicKey,
  slotNumber: BN
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptSlotId] = await findReceiptSlotAddress(userId, slotNumber);

  const [receiptMarkerId] = await findReceiptMarkerAddress(tokenManagerId);

  return rentalCounterProgram.instruction.remove({
    accounts: {
      tokenManager: tokenManagerId,
      receiptSlot: receiptSlotId,
      receiptMarker: receiptMarkerId,
      closer: wallet.publicKey,
    },
  });
};
