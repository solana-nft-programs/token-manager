import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { RENTAL_COUNTER_ADDRESS, RENTAL_COUNTER_SEED } from "./constants";

/**
 * Finds the address of the rental counter for the user.
 * @returns
 */
export const findRentalCounterAddress = async (
  user: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(RENTAL_COUNTER_SEED), user.toBuffer()],
    RENTAL_COUNTER_ADDRESS
  );
};
