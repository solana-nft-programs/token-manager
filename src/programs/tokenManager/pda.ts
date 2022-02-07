import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { MINT_MANAGER_SEED, TRANSFER_RECEIPT_SEED } from ".";
import {
  CLAIM_RECEIPT_SEED,
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_SEED,
} from "./constants";

/**
 * Finds the token manager address.
 * @returns
 */
export const findTokenManagerAddress = async (
  mint: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(TOKEN_MANAGER_SEED), mint.toBuffer()],
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
