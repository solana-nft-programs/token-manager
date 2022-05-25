import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import type { IssueParameters } from ".";
import {
  withClaimToken,
  withExtendExpiration,
  withExtendUsages,
  withInvalidate,
  withIssueToken,
  withUnissueToken,
  withUse,
} from ".";

export const useTransaction = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  usages: number,
  collector?: PublicKey
): Promise<Transaction> =>
  withUse(new Transaction(), connection, wallet, mintId, usages, collector);

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> =>
  withInvalidate(new Transaction(), connection, wallet, mintId);

export const issueToken = async (
  connection: Connection,
  wallet: Wallet,
  rentalParameters: IssueParameters
): Promise<[Transaction, PublicKey, Keypair | undefined]> =>
  withIssueToken(new Transaction(), connection, wallet, rentalParameters);

export const unissueToken = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> =>
  withUnissueToken(new Transaction(), connection, wallet, mintId);

export const claimToken = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  additionalOptions?: {
    otpKeypair?: Keypair | null;
    timeInvalidatorId?: PublicKey;
  },
  paymentManagerName?: string
): Promise<Transaction> =>
  withClaimToken(
    new Transaction(),
    connection,
    wallet,
    tokenManagerId,
    additionalOptions,
    paymentManagerName
  );

export const extendExpiration = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentAmount: number
): Promise<Transaction> =>
  withExtendExpiration(
    new Transaction(),
    connection,
    wallet,
    tokenManagerId,
    paymentAmount
  );

export const extendUsages = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentAmount: number
): Promise<Transaction> =>
  withExtendUsages(
    new Transaction(),
    connection,
    wallet,
    tokenManagerId,
    paymentAmount
  );
