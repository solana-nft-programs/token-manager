import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import {
  LISTING_SEED,
  MARKETPLACE_SEED,
  TRANSFER_AUTHORITY_ADDRESS,
  TRANSFER_AUTHORITY_SEED,
} from "./constants";

/**
 * Finds the address of the transfer authority.
 * @returns
 */
export const findTransferAuthorityAddress = async (
  name: string
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [
      utils.bytes.utf8.encode(TRANSFER_AUTHORITY_SEED),
      utils.bytes.utf8.encode(name),
    ],
    TRANSFER_AUTHORITY_ADDRESS
  );
};
/**
 * Finds the address of the marketplace.
 * @returns
 */
export const findMarketplaceAddress = async (
  name: string
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(MARKETPLACE_SEED), utils.bytes.utf8.encode(name)],
    TRANSFER_AUTHORITY_ADDRESS
  );
};
/**
 * Finds the address of the listing.
 * @returns
 */
export const findListingAddress = async (
  tokenManager: PublicKey
): Promise<[PublicKey, number]> => {
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(LISTING_SEED), tokenManager.toBytes()],
    TRANSFER_AUTHORITY_ADDRESS
  );
};
