import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { CLAIM_APPROVER_ADDRESS, CLAIM_APPROVER_SEED } from "./constants";

/**
 * Finds the address of the Pool.
 * @returns
 */
export const findClaimApproverAddress = async (
  tokenManagerId: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(CLAIM_APPROVER_SEED), tokenManagerId.toBuffer()],
    CLAIM_APPROVER_ADDRESS
  );
};
