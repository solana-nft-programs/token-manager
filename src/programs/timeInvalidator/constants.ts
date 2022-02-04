import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as TIME_INVALIDATOR_TYPES from "../../idl/cardinal_time_invalidator";

export const TIME_INVALIDATOR_ADDRESS = new PublicKey(
  "tmexpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe"
);

export const TIME_INVALIDATOR_SEED = "time-invalidator";

export const TIME_INVALIDATOR_IDL = TIME_INVALIDATOR_TYPES.IDL;

export type TIME_INVALIDATOR_PROGRAM =
  TIME_INVALIDATOR_TYPES.CardinalTimeInvalidator;

export type TimeInvalidatorTypes = AnchorTypes<
  TIME_INVALIDATOR_PROGRAM,
  {
    tokenManager: TimeInvalidatorData;
  }
>;

type Accounts = TimeInvalidatorTypes["Accounts"];
export type TimeInvalidatorData = Accounts["timeInvalidator"];
