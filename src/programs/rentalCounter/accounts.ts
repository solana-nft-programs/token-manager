import { Program, Provider } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import { findRentalCounterAddress } from ".";
import type { RENTAL_COUNTER_PROGRAM, RentalCounterData } from "./constants";
import { RENTAL_COUNTER_ADDRESS, RENTAL_COUNTER_IDL } from "./constants";

// TODO fix types
export const getRentalCounter = async (
  connection: Connection,
  user: PublicKey
): Promise<AccountData<RentalCounterData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const rentalCounterProgram = new Program<RENTAL_COUNTER_PROGRAM>(
    RENTAL_COUNTER_IDL,
    RENTAL_COUNTER_ADDRESS,
    provider
  );

  const [rentalCounterId] = await findRentalCounterAddress(user);

  const parsed = await rentalCounterProgram.account.rentalCounter.fetch(
    rentalCounterId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: rentalCounterId,
  };
};
