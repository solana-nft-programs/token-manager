import { AnchorProvider, Program } from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { USE_INVALIDATOR_PROGRAM, UseInvalidatorData } from "./constants";
import { USE_INVALIDATOR_ADDRESS, USE_INVALIDATOR_IDL } from "./constants";

export const getUseInvalidator = async (
  connection: Connection,
  useInvalidatorId: PublicKey
): Promise<AccountData<UseInvalidatorData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const parsed = await useInvalidatorProgram.account.useInvalidator.fetch(
    useInvalidatorId
  );
  return {
    parsed,
    pubkey: useInvalidatorId,
  };
};

export const getUseInvalidators = async (
  connection: Connection,
  useInvalidatorIds: PublicKey[]
): Promise<AccountData<UseInvalidatorData>[]> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  let useInvalidators: (UseInvalidatorData | null)[] = [];
  try {
    useInvalidators =
      (await useInvalidatorProgram.account.useInvalidator.fetchMultiple(
        useInvalidatorIds
      )) as (UseInvalidatorData | null)[];
  } catch (e) {
    console.log(e);
  }
  return useInvalidators.map((tm, i) => ({
    parsed: tm!,
    pubkey: useInvalidatorIds[i]!,
  }));
};
