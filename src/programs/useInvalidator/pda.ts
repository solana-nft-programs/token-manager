import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { USE_INVALIDATOR_ADDRESS, USE_INVALIDATOR_SEED } from "./constants";

/**
 * Finds the use invalidator for this token manager.
 * @returns
 */
export const findUseInvalidatorAddress = async (
  tokenManagerId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(USE_INVALIDATOR_SEED), tokenManagerId.toBuffer()],
    USE_INVALIDATOR_ADDRESS
  );
};
