import { utils } from "@project-serum/anchor";
import * as web3 from "@solana/web3.js";

import { STAKE_ENTRY_SEED, STAKE_POOL_ADDRESS, STAKE_POOL_SEED } from ".";

/**
 * Finds the stake pool id.
 * @returns
 */
export const findStakePoolId = async (
  identifier: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return web3.PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(STAKE_POOL_SEED), identifier.toBuffer()],
    STAKE_POOL_ADDRESS
  );
};

/**
 * Finds the stake entry id.
 * @returns
 */
export const findStakeEntryId = async (
  stakePoolIdentifier: web3.PublicKey,
  originalMintId: web3.PublicKey
): Promise<[web3.PublicKey, number]> => {
  return web3.PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(STAKE_ENTRY_SEED),
      stakePoolIdentifier.toBuffer(),
      originalMintId.toBuffer(),
    ],
    STAKE_POOL_ADDRESS
  );
};
