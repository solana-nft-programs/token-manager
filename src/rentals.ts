import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import type { IssueParameters } from ".";
import { withClaimToken, withExtendExpiration, withIssueToken } from ".";

/**
 * Main method for creating any kind of rental
 * Allows for optional payment, optional usages or expiration and includes a otp for private links
 * @param connection
 * @param wallet
 * @returns Transaction, public key for the created token manager and a otp if necessary for private links
 */
export const createRental = async (
  connection: Connection,
  wallet: Wallet,
  rentalParameters: IssueParameters
): Promise<[Transaction, PublicKey, Keypair | undefined]> =>
  withIssueToken(new Transaction(), connection, wallet, rentalParameters);

export const claimRental = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  timeInvalidatorId?: PublicKey
): Promise<Transaction> =>
  withClaimToken(new Transaction(), connection, wallet, tokenManagerId, {
    timeInvalidatorId,
  });

export const extendRentalExpiration = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  secondsToAdd: number
): Promise<Transaction> =>
  withExtendExpiration(
    new Transaction(),
    connection,
    wallet,
    tokenManagerId,
    secondsToAdd
  );
