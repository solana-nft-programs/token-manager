import { Program, Provider } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { USE_INVALIDATOR_PROGRAM, UseInvalidatorData } from "./constants";
import { USE_INVALIDATOR_ADDRESS, USE_INVALIDATOR_IDL } from "./constants";

// TODO fix types
export const getUseInvalidator = async (
  connection: Connection,
  useInvalidatorId: PublicKey
): Promise<AccountData<UseInvalidatorData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const parsed = await useInvalidatorProgram.account.useInvalidator.fetch(
    useInvalidatorId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: useInvalidatorId,
  };
};

export const getUseInvalidators = async (
  connection: Connection,
  useInvalidatorIds: PublicKey[]
): Promise<AccountData<UseInvalidatorData>[]> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let useInvalidators = [];
  try {
    useInvalidators =
      await useInvalidatorProgram.account.useInvalidator.fetchMultiple(
        useInvalidatorIds
      );
  } catch (e) {
    console.log(e);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return useInvalidators.map((tm, i) => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    parsed: tm,
    pubkey: useInvalidatorIds[i],
  }));
};
