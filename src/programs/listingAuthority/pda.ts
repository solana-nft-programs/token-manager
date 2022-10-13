import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";

import { findTokenManagerAddress } from "../tokenManager/pda";
import {
  LISTING_AUTHORITY_ADDRESS,
  LISTING_SEED,
  MARKETPLACE_SEED,
  TRANSFER_AUTHORITY_SEED,
  TRANSFER_SEED,
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
    LISTING_AUTHORITY_ADDRESS
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
    LISTING_AUTHORITY_ADDRESS
  );
};

/**
 * Finds the address of the listing.
 * @returns
 */
export const findListingAddress = async (
  mintId: PublicKey
): Promise<[PublicKey, number]> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(LISTING_SEED), tokenManagerId.toBytes()],
    LISTING_AUTHORITY_ADDRESS
  );
};

/**
 * Finds the address of the transfer.
 * @returns
 */
export const findTransferAddress = async (
  mintId: PublicKey
): Promise<[PublicKey, number]> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  return await PublicKey.findProgramAddress(
    [utils.bytes.utf8.encode(TRANSFER_SEED), tokenManagerId.toBytes()],
    LISTING_AUTHORITY_ADDRESS
  );
};
