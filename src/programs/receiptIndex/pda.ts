import type { BN } from "@project-serum/anchor";
import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { RECEIPT_MARKER_SEED } from ".";
import {
  RECEIPT_COUNTER_SEED,
  RECEIPT_INDEX_ADDRESS,
  RECEIPT_SLOT_SEED,
} from "./constants";

/**
 * Finds the address of the receipt counter for the user.
 * @returns
 */
export const findReceiptCounterAddress = async (
  user: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(RECEIPT_COUNTER_SEED), user.toBuffer()],
    RECEIPT_INDEX_ADDRESS
  );
};

/**
 * Finds the address of the receipt slot for this issuer.
 * @returns
 */
export const findReceiptSlotAddress = async (
  issuerId: PublicKey,
  slotNumber: BN
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(RECEIPT_SLOT_SEED),
      issuerId.toBuffer(),
      slotNumber.toArrayLike(Buffer, "le", 8),
    ],
    RECEIPT_INDEX_ADDRESS
  );
};

/**
 * Finds the address of the receipt marker for this token manager.
 * @returns
 */
export const findReceiptMarkerAddress = async (
  tokenManagerId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(RECEIPT_MARKER_SEED), tokenManagerId.toBuffer()],
    RECEIPT_INDEX_ADDRESS
  );
};
