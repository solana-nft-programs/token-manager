import { BN, BorshAccountsCoder } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { AccountData } from "@solana-nft-programs/common";

import type { TimeInvalidatorData } from "./constants";
import {
  TIME_INVALIDATOR_ADDRESS,
  TIME_INVALIDATOR_IDL,
  timeInvalidatorProgram,
} from "./constants";

export const getTimeInvalidator = async (
  connection: Connection,
  timeInvalidatorId: PublicKey
): Promise<AccountData<TimeInvalidatorData>> => {
  const program = timeInvalidatorProgram(connection);

  const parsed = await program.account.timeInvalidator.fetch(timeInvalidatorId);
  return {
    parsed,
    pubkey: timeInvalidatorId,
  };
};

export const getTimeInvalidators = async (
  connection: Connection,
  timeInvalidatorIds: PublicKey[]
): Promise<AccountData<TimeInvalidatorData | null>[]> => {
  const program = timeInvalidatorProgram(connection);

  let timeInvalidators: (TimeInvalidatorData | null)[] = [];
  try {
    timeInvalidators = (await program.account.timeInvalidator.fetchMultiple(
      timeInvalidatorIds
    )) as (TimeInvalidatorData | null)[];
  } catch (e) {
    console.log(e);
  }
  return timeInvalidators.map((data, i) => ({
    parsed: data,
    pubkey: timeInvalidatorIds[i]!,
  }));
};

export const getExpiredTimeInvalidators = async (
  connection: Connection
): Promise<AccountData<TimeInvalidatorData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TIME_INVALIDATOR_ADDRESS
  );

  const expiredTimeInvalidators: AccountData<TimeInvalidatorData>[] = [];
  const coder = new BorshAccountsCoder(TIME_INVALIDATOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const timeInvalidatorData: TimeInvalidatorData = coder.decode(
        "timeInvalidator",
        account.account.data
      );
      if (timeInvalidatorData.expiration?.lte(new BN(Date.now() / 1000))) {
        expiredTimeInvalidators.push({
          ...account,
          parsed: timeInvalidatorData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode time invalidator data`);
    }
  });
  return expiredTimeInvalidators;
};

export const getAllTimeInvalidators = async (
  connection: Connection
): Promise<AccountData<TimeInvalidatorData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TIME_INVALIDATOR_ADDRESS
  );

  const expiredTimeInvalidators: AccountData<TimeInvalidatorData>[] = [];
  const coder = new BorshAccountsCoder(TIME_INVALIDATOR_IDL);
  programAccounts.forEach((account) => {
    try {
      const timeInvalidatorData: TimeInvalidatorData = coder.decode(
        "timeInvalidator",
        account.account.data
      );
      expiredTimeInvalidators.push({
        ...account,
        parsed: timeInvalidatorData,
      });
    } catch (e) {
      console.log(`Failed to decode time invalidator data`);
    }
  });
  return expiredTimeInvalidators;
};
