import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import {
  MINT_COUNTER_SEED,
  MINT_MANAGER_SEED,
  RECEIPT_MINT_MANAGER_SEED,
  TRANSFER_RECEIPT_SEED,
} from ".";
import {
  CLAIM_RECEIPT_SEED,
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_SEED,
} from "./constants";

/**
 * Finds the token manager address for a given mint
 * @returns
 */
export const tryTokenManagerAddressFromMint = (
  mint: PublicKey
): PublicKey | null => {
  try {
    const tokenManagerId = tokenManagerAddressFromMint(mint);
    return tokenManagerId;
  } catch (e) {
    return null;
  }
};

/**
 * Finds the token manager address for a given mint
 * @returns
 */
export const tokenManagerAddressFromMint = (mint: PublicKey): PublicKey => {
  const tokenManagerId = findTokenManagerAddress(mint);
  return tokenManagerId;
};

/**
 * Finds the token manager address for a given mint and mint counter
 * @returns
 */
export const findTokenManagerAddress = (mint: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(TOKEN_MANAGER_SEED), mint.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  )[0];
};

/**
 * Finds the claim receipt id.
 * @returns
 */
export const findClaimReceiptId = (
  tokenManagerId: PublicKey,
  recipientKey: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [
      utils.bytes.utf8.encode(CLAIM_RECEIPT_SEED),
      tokenManagerId.toBuffer(),
      recipientKey.toBuffer(),
    ],
    TOKEN_MANAGER_ADDRESS
  )[0];
};

/**
 * Finds the transfer receipt id.
 * @returns
 */
export const findTransferReceiptId = (tokenManagerId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(TRANSFER_RECEIPT_SEED), tokenManagerId.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  )[0];
};

/**
 * Finds the mint manager id.
 * @returns
 */
export const findMintManagerId = (mintId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(MINT_MANAGER_SEED), mintId.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  )[0];
};

/**
 * Finds the mint counter id.
 * @returns
 */
export const findMintCounterId = (mintId: PublicKey): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(MINT_COUNTER_SEED), mintId.toBuffer()],
    TOKEN_MANAGER_ADDRESS
  )[0];
};

/**
 * Finds the receipt mint manager id.
 * @returns
 */
export const findReceiptMintManagerId = (): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(RECEIPT_MINT_MANAGER_SEED)],
    TOKEN_MANAGER_ADDRESS
  )[0];
};
