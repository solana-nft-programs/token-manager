import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_SEED } from "./constants";

/**
 * Finds the token manager address.
 * @returns
 */
export const findTokenManagerAddress = async (
  issuerId: PublicKey,
  seed: Uint8Array
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(TOKEN_MANAGER_SEED), issuerId.toBuffer(), seed],
    TOKEN_MANAGER_ADDRESS
  );
};
