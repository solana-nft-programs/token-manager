import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as LISTING_AUTHORITY_TYPES from "../../idl/cardinal_listing_authority";

export const LISTING_AUTHORITY_ADDRESS = new PublicKey(
  "trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW"
);

export const LISTING_AUTHORITY_SEED = "listing-authority";
export const MARKETPLACE_SEED = "marketplace";
export const LISTING_SEED = "listing";

export const LISTING_AUTHORITY_IDL = LISTING_AUTHORITY_TYPES.IDL;

export type LISTING_AUTHORITY_PROGRAM =
  LISTING_AUTHORITY_TYPES.CardinalListingAuthority;

export type ListingAuthorityTypes = AnchorTypes<
  LISTING_AUTHORITY_PROGRAM,
  {
    tokenManager: ListingAuthorityData;
  }
>;

type Accounts = ListingAuthorityTypes["Accounts"];
export type ListingAuthorityData = Accounts["listingAuthority"];
export type MarketplaceData = Accounts["marketplace"];
export type ListingData = Accounts["listing"];
