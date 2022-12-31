import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { TIME_INVALIDATOR_ADDRESS, TIME_INVALIDATOR_SEED } from "./constants";

/**
 * Finds the time invalidator for this token manager.
 * @returns
 */
export const findTimeInvalidatorAddress = (
  tokenManagerId: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(TIME_INVALIDATOR_SEED), tokenManagerId.toBuffer()],
    TIME_INVALIDATOR_ADDRESS
  )[0];
};
