import { Program, Provider } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type {
  TIME_INVALIDATOR_PROGRAM,
  TimeInvalidatorData,
} from "./constants";
import { TIME_INVALIDATOR_ADDRESS, TIME_INVALIDATOR_IDL } from "./constants";

// TODO fix types
export const getUseInvalidator = async (
  connection: Connection,
  timeInvalidatorId: PublicKey
): Promise<AccountData<TimeInvalidatorData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const timeInvalidatorProgram = new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    provider
  );

  const parsed = await timeInvalidatorProgram.account.timeInvalidator.fetch(
    timeInvalidatorId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: timeInvalidatorId,
  };
};
