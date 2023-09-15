import type { Connection, PublicKey } from "@solana/web3.js";
import type { AccountData } from "@solana-nft-programs/common";

import type { UseInvalidatorData } from "./constants";
import { useInvalidatorProgram } from "./constants";

export const getUseInvalidator = async (
  connection: Connection,
  useInvalidatorId: PublicKey
): Promise<AccountData<UseInvalidatorData>> => {
  const program = useInvalidatorProgram(connection);

  const parsed = await program.account.useInvalidator.fetch(useInvalidatorId);
  return {
    parsed,
    pubkey: useInvalidatorId,
  };
};

export const getUseInvalidators = async (
  connection: Connection,
  useInvalidatorIds: PublicKey[]
): Promise<AccountData<UseInvalidatorData | null>[]> => {
  const program = useInvalidatorProgram(connection);

  let useInvalidators: (UseInvalidatorData | null)[] = [];
  try {
    useInvalidators = (await program.account.useInvalidator.fetchMultiple(
      useInvalidatorIds
    )) as (UseInvalidatorData | null)[];
  } catch (e) {
    console.log(e);
  }
  return useInvalidators.map((parsed, i) => ({
    parsed,
    pubkey: useInvalidatorIds[i]!,
  }));
};
