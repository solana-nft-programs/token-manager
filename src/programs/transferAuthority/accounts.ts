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
  ListingData,
  MarketplaceData,
  TRANSFER_AUTHORITY_PROGRAM,
  TransferAuthorityData,
} from "./constants";
import {
  TRANSFER_AUTHORITY_ADDRESS,
  TRANSFER_AUTHORITY_IDL,
} from "./constants";
import {
  findListingAddress,
  findMarketplaceAddress,
  findTransferAuthorityAddress,
} from "./pda";

//////// TRANSFER AUTHORITY ////////

export const getTransferAuthority = async (
  connection: Connection,
  name: string
): Promise<AccountData<TransferAuthorityData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const transferAuthorityProgram = new Program<TRANSFER_AUTHORITY_PROGRAM>(
    TRANSFER_AUTHORITY_IDL,
    TRANSFER_AUTHORITY_ADDRESS,
    provider
  );

  const [transferAuthorityId] = await findTransferAuthorityAddress(name);

  const parsed = await transferAuthorityProgram.account.transferAuthority.fetch(
    transferAuthorityId
  );
  return {
    parsed,
    pubkey: transferAuthorityId,
  };
};

export const getAllTransferAuthorities = async (
  connection: Connection
): Promise<AccountData<TransferAuthorityData>[]> =>
  getAllOfType<TransferAuthorityData>(connection, "transferAuthority");

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
  const transferAuthorityProgram = new Program<TRANSFER_AUTHORITY_PROGRAM>(
    TRANSFER_AUTHORITY_IDL,
    TRANSFER_AUTHORITY_ADDRESS,
    provider
  );

  const [marketplaceId] = await findMarketplaceAddress(name);

  const parsed = await transferAuthorityProgram.account.marketplace.fetch(
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
  getAllOfType<TransferAuthorityData>(connection, "marketplace");

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
  const transferAuthorityProgram = new Program<TRANSFER_AUTHORITY_PROGRAM>(
    TRANSFER_AUTHORITY_IDL,
    TRANSFER_AUTHORITY_ADDRESS,
    provider
  );

  const [listingId] = await findListingAddress(tokenManagerId);

  const parsed = await transferAuthorityProgram.account.listing.fetch(
    listingId
  );
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
    TRANSFER_AUTHORITY_ADDRESS,
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
  const coder = new BorshAccountsCoder(TRANSFER_AUTHORITY_IDL);
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
    TRANSFER_AUTHORITY_ADDRESS,
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
  const coder = new BorshAccountsCoder(TRANSFER_AUTHORITY_IDL);
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
