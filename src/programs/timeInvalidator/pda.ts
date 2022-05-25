import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { TIME_INVALIDATOR_ADDRESS, TIME_INVALIDATOR_SEED } from "./constants";

/**
 * Finds the tome invalidator for this token manager.
 * @returns
 */
export const findTimeInvalidatorAddress = async (
  tokenManagerId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(TIME_INVALIDATOR_SEED), tokenManagerId.toBuffer()],
    TIME_INVALIDATOR_ADDRESS
  );
};
