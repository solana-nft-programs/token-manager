import { utils } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import { USE_INVALIDATOR_ADDRESS, USE_INVALIDATOR_SEED } from "./constants";

/**
 * Finds the use invalidator for this token manager.
 * @returns
 */
export const findUseInvalidatorAddress = (
  tokenManagerId: PublicKey
): PublicKey => {
  return PublicKey.findProgramAddressSync(
    [utils.bytes.utf8.encode(USE_INVALIDATOR_SEED), tokenManagerId.toBuffer()],
    USE_INVALIDATOR_ADDRESS
  )[0];
};
