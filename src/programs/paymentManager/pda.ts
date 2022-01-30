import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { PAYMENT_MANAGER_ADDRESS, PAYMENT_MANAGER_SEED } from "./constants";

/**
 * Finds the address of the Pool.
 * @returns
 */
export const findPaymentManagerAddress = async (
  tokenManagerId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(PAYMENT_MANAGER_SEED), tokenManagerId.toBuffer()],
    PAYMENT_MANAGER_ADDRESS
  );
};
