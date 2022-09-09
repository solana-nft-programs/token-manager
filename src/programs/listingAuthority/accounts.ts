import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
  utils,
} from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type {
  LISTING_AUTHORITY_PROGRAM,
  ListingAuthorityData,
  ListingData,
  MarketplaceData,
} from "./constants";
import { LISTING_AUTHORITY_ADDRESS, LISTING_AUTHORITY_IDL } from "./constants";
import {
  findListingAddress,
  findListingAuthorityAddress,
  findMarketplaceAddress,
} from "./pda";

//////// LISTING AUTHORITY ////////

export const getListingAuthority = async (
  connection: Connection,
  name: string
): Promise<AccountData<ListingAuthorityData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const listingAuthorityProgram = new Program<LISTING_AUTHORITY_PROGRAM>(
    LISTING_AUTHORITY_IDL,
    LISTING_AUTHORITY_ADDRESS,
    provider
  );

  const [listingAuthorityId] = await findListingAuthorityAddress(name);

  const parsed = await listingAuthorityProgram.account.listingAuthority.fetch(
    listingAuthorityId
  );
  return {
    parsed,
    pubkey: listingAuthorityId,
  };
};

export const getAllListingAuthorities = async (
  connection: Connection
): Promise<AccountData<ListingAuthorityData>[]> =>
  getAllOfType<ListingAuthorityData>(connection, "listingAuthority");

//////// MARKETPLACE ////////

export const getMarketplace = async (
  connection: Connection,
  name: string
): Promise<AccountData<MarketplaceData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const listingAuthorityProgram = new Program<LISTING_AUTHORITY_PROGRAM>(
    LISTING_AUTHORITY_IDL,
    LISTING_AUTHORITY_ADDRESS,
    provider
  );

  const [marketplaceId] = await findMarketplaceAddress(name);

  const parsed = await listingAuthorityProgram.account.marketplace.fetch(
    marketplaceId
  );
  return {
    parsed,
    pubkey: marketplaceId,
  };
};

export const getAllMarketplaces = async (
  connection: Connection
): Promise<AccountData<MarketplaceData>[]> =>
  getAllOfType<ListingAuthorityData>(connection, "marketplace");

//////// LISTING ////////

export const getListing = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<ListingData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const listingAuthorityProgram = new Program<LISTING_AUTHORITY_PROGRAM>(
    LISTING_AUTHORITY_IDL,
    LISTING_AUTHORITY_ADDRESS,
    provider
  );

  const [listingId] = await findListingAddress(tokenManagerId);

  const parsed = await listingAuthorityProgram.account.listing.fetch(listingId);
  return {
    parsed,
    pubkey: listingId,
  };
};

export const getListingForMarketplace = async (
  connection: Connection,
  marketplaceId: PublicKey
): Promise<AccountData<ListingData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    LISTING_AUTHORITY_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("listing")
            ),
          },
        },
        { memcmp: { offset: 55, bytes: marketplaceId.toBase58() } },
      ],
    }
  );

  const datas: AccountData<ListingData>[] = [];
  const coder = new BorshAccountsCoder(LISTING_AUTHORITY_IDL);
  programAccounts.forEach((account) => {
    try {
      const data: ListingData = coder.decode("listing", account.account.data);
      if (data) {
        datas.push({
          ...account,
          parsed: data,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });

  return datas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};

export const getAllListings = async (
  connection: Connection
): Promise<AccountData<ListingData>[]> =>
  getAllOfType<ListingData>(connection, "listing");

//////// utils ////////
export const getAllOfType = async <T>(
  connection: Connection,
  key: string
): Promise<AccountData<T>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    LISTING_AUTHORITY_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator(key)
            ),
          },
        },
      ],
    }
  );

  const datas: AccountData<T>[] = [];
  const coder = new BorshAccountsCoder(LISTING_AUTHORITY_IDL);
  programAccounts.forEach((account) => {
    try {
      const data: T = coder.decode(key, account.account.data);
      if (data) {
        datas.push({
          ...account,
          parsed: data,
        });
      }
      // eslint-disable-next-line no-empty
    } catch (e) {}
  });

  return datas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};
