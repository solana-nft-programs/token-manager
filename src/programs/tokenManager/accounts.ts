import {
  BN,
  BorshAccountsCoder,
  Program,
  Provider,
  utils,
} from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { TokenManagerState } from ".";
import type {
  MintCounterData,
  MintManagerData,
  TOKEN_MANAGER_PROGRAM,
  TokenManagerData,
} from "./constants";
import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_IDL } from "./constants";

// TODO fix types
export const getTokenManager = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<TokenManagerData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.tokenManager.fetch(
    tokenManagerId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: tokenManagerId,
  };
};

export const getTokenManagers = async (
  connection: Connection,
  tokenManagerIds: PublicKey[]
): Promise<AccountData<TokenManagerData>[]> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let tokenManagers = [];
  try {
    tokenManagers =
      await tokenManagerProgram.account.tokenManager.fetchMultiple(
        tokenManagerIds
      );
  } catch (e) {
    console.log(e);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return tokenManagers.map((tm, i) => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    parsed: tm,
    pubkey: tokenManagerIds[i],
  }));
};

export const getAllIssuedTokenManagersByState = async (
  connection: Connection,
  state: TokenManagerState
): Promise<AccountData<TokenManagerData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 92,
            bytes: utils.bytes.bs58.encode(
              new BN(1).toArrayLike(Buffer, "le", 1)
            ),
          },
        },
      ],
    }
  );

  const tokenManagerDatas: AccountData<TokenManagerData>[] = [];
  const coder = new BorshAccountsCoder(TOKEN_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tokenManagerData: TokenManagerData = coder.decode(
        "tokenManager",
        account.account.data
      );
      if (tokenManagerData) {
        tokenManagerDatas.push({
          ...account,
          parsed: tokenManagerData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode token manager data`);
    }
  });

  return tokenManagerDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};

// TODO fix types
export const getMintManager = async (
  connection: Connection,
  mintManagerId: PublicKey
): Promise<AccountData<MintManagerData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.mintManager.fetch(
    mintManagerId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: mintManagerId,
  };
};

// TODO fix types
export const getMintCounter = async (
  connection: Connection,
  mintCounterId: PublicKey
): Promise<AccountData<MintCounterData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.mintCounter.fetch(
    mintCounterId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: mintCounterId,
  };
};
