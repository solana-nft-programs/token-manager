import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

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
 * Finds the token manager address.
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
