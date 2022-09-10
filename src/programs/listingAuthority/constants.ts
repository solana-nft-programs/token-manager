import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as LISTING_AUTHORITY_TYPES from "../../idl/cardinal_listing_authority";

export const LISTING_AUTHORITY_ADDRESS = new PublicKey(
  "t7UND4Dhg8yoykPAr1WjwfZhfHDwXih5RY8voM47FMS"
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

export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const DEFAULT_LISTING_AUTHORITY_NAME = "global";

type Accounts = ListingAuthorityTypes["Accounts"];
export type ListingAuthorityData = Accounts["listingAuthority"];
export type MarketplaceData = Accounts["marketplace"];
export type ListingData = Accounts["listing"];
