import { BorshAccountsCoder, utils } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { AccountData } from "@solana-nft-programs/common";

import type {
  ListingData,
  MarketplaceData,
  TransferAuthorityData,
  TransferData,
} from "./constants";
import {
  TRANSFER_AUTHORITY_ADDRESS,
  TRANSFER_AUTHORITY_IDL,
  transferAuthorityProgram,
} from "./constants";
import {
  findListingAddress,
  findMarketplaceAddress,
  findTransferAddress,
  findTransferAuthorityAddress,
} from "./pda";

//////// TRANSFER AUTHORITY ////////

export const getTransferAuthority = async (
  connection: Connection,
  transferAuthorityId: PublicKey
): Promise<AccountData<TransferAuthorityData>> => {
  const program = transferAuthorityProgram(connection);

  const parsed = await program.account.transferAuthority.fetch(
    transferAuthorityId
  );
  return {
    parsed,
    pubkey: transferAuthorityId,
  };
};

export const getTransferAuthorityByName = async (
  connection: Connection,
  name: string
): Promise<AccountData<TransferAuthorityData>> => {
  const program = transferAuthorityProgram(connection);

  const transferAuthorityId = findTransferAuthorityAddress(name);

  const parsed = await program.account.transferAuthority.fetch(
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
  marketplaceId: PublicKey
): Promise<AccountData<MarketplaceData>> => {
  const program = transferAuthorityProgram(connection);

  const parsed = await program.account.marketplace.fetch(marketplaceId);
  return {
    parsed,
    pubkey: marketplaceId,
  };
};

export const getMarketplaceByName = async (
  connection: Connection,
  name: string
): Promise<AccountData<MarketplaceData>> => {
  const program = transferAuthorityProgram(connection);

  const marketplaceId = findMarketplaceAddress(name);

  const parsed = await program.account.marketplace.fetch(marketplaceId);
  return {
    parsed,
    pubkey: marketplaceId,
  };
};

export const getAllMarketplaces = async (
  connection: Connection
): Promise<AccountData<MarketplaceData>[]> =>
  getAllOfType<MarketplaceData>(connection, "marketplace");

//////// LISTING ////////

export const getListing = async (
  connection: Connection,
  mintId: PublicKey
): Promise<AccountData<ListingData>> => {
  const program = transferAuthorityProgram(connection);

  const listingId = findListingAddress(mintId);

  const parsed = await program.account.listing.fetch(listingId);
  return {
    parsed,
    pubkey: listingId,
  };
};

export const getListingsForMarketplace = async (
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
        { memcmp: { offset: 73, bytes: marketplaceId.toBase58() } },
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

export const getListingsForIssuer = async (
  connection: Connection,
  issuerId: PublicKey
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
        { memcmp: { offset: 9, bytes: issuerId.toBase58() } },
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

//////// Transfer ////////

export const getTransfer = async (
  connection: Connection,
  mintId: PublicKey
): Promise<AccountData<TransferData>> => {
  const program = transferAuthorityProgram(connection);

  const transferId = findTransferAddress(mintId);
  const parsed = await program.account.transfer.fetch(transferId);
  return {
    parsed,
    pubkey: transferId,
  };
};

export const getTransfersFromUser = async (
  connection: Connection,
  from: PublicKey
): Promise<AccountData<TransferData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TRANSFER_AUTHORITY_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("transfer")
            ),
          },
        },
        { memcmp: { offset: 41, bytes: from.toBase58() } },
      ],
    }
  );

  const datas: AccountData<TransferData>[] = [];
  const coder = new BorshAccountsCoder(TRANSFER_AUTHORITY_IDL);
  programAccounts.forEach((account) => {
    try {
      const data: TransferData = coder.decode("transfer", account.account.data);
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

export const getTransfersToUser = async (
  connection: Connection,
  to: PublicKey
): Promise<AccountData<TransferData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TRANSFER_AUTHORITY_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("transfer")
            ),
          },
        },
        { memcmp: { offset: 73, bytes: to.toBase58() } },
      ],
    }
  );

  const datas: AccountData<TransferData>[] = [];
  const coder = new BorshAccountsCoder(TRANSFER_AUTHORITY_IDL);
  programAccounts.forEach((account) => {
    try {
      const data: TransferData = coder.decode("transfer", account.account.data);
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
