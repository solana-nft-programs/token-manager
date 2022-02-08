import type { BN } from "@project-serum/anchor";
import { utils } from "@project-serum/anchor";
import type { Connection } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";

import { tryGetAccount } from "../..";
import { MINT_COUNTER_SEED, MINT_MANAGER_SEED, TRANSFER_RECEIPT_SEED } from ".";
import { getMintCounter } from "./accounts";
import {
  CLAIM_RECEIPT_SEED,
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_SEED,
} from "./constants";

/**
 * Finds the token manager address for a given mint
 * @returns
 */
export const tryTokenManagerAddressFromMint = async (
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey | undefined> => {
  const [mintCounterId] = await findMintCounterId(mint);

  const mintCounter = await tryGetAccount(() =>
    getMintCounter(connection, mintCounterId)
  );
  return mintCounter?.parsed?.tokenManager;
};

/**
 * Finds the token manager address for a given mint
 * @returns
 */
export const tokenManagerAddressFromMint = async (
  connection: Connection,
  mint: PublicKey
): Promise<PublicKey> => {
  const [mintCounterId] = await findMintCounterId(mint);
  const mintCounter = await getMintCounter(connection, mintCounterId);
  return mintCounter.parsed.tokenManager;
};

/**
 * Finds the token manager address for a given mint and mint counter
 * @returns
 */
export const findTokenManagerAddress = async (
  mint: PublicKey,
  mintCount: BN
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(TOKEN_MANAGER_SEED),
      mint.toBuffer(),
      mintCount.toArrayLike(Buffer, "le", 8),
    ],
    TOKEN_MANAGER_ADDRESS
  );
};

/**
 * Finds the claim receipt id.
 * @returns
 */
export const findClaimReceiptId = async (
  tokenManagerKey: PublicKey,
  recipientKey: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(CLAIM_RECEIPT_SEED),
      tokenManagerKey.toBuffer(),
      recipientKey.toBuffer(),
    ],
    TOKEN_MANAGER_ADDRESS
  );
};

/**
 * Finds the transfer receipt id.
 * @returns
 */
export const findTransferReceiptId = async (
  tokenManagerKey: PublicKey,
  recipientKey: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(TRANSFER_RECEIPT_SEED),
      tokenManagerKey.toBuffer(),
      recipientKey.toBuffer(),
    ],
    TOKEN_MANAGER_ADDRESS
  );
};

/**
 * Finds the mint manager id.
 * @returns
 */
export const findMintManagerId = async (
  mintId: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(MINT_MANAGER_SEED), mintId.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  );
};

/**
 * Finds the mint counter id.
 * @returns
 */
export const findMintCounterId = async (
  mintId: PublicKey
): Promise<[PublicKey, number]> => {
  return PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(MINT_COUNTER_SEED), mintId.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  );
};
