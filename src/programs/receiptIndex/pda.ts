import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { RECEIPT_MARKER_SEED } from ".";
import { RECEIPT_INDEX_ADDRESS } from "./constants";

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
