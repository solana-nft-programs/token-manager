import { Program, Provider } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type {
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
