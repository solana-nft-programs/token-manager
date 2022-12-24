import type { ParsedIdlAccountData } from "@cardinal/common";
import { PublicKey } from "@solana/web3.js";

import * as TIME_INVALIDATOR_TYPES from "../../idl/cardinal_time_invalidator";

export const TIME_INVALIDATOR_ADDRESS = new PublicKey(
  "tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE"
);

export const TIME_INVALIDATOR_SEED = "time-invalidator";

export const TIME_INVALIDATOR_IDL = TIME_INVALIDATOR_TYPES.IDL;

export type TIME_INVALIDATOR_PROGRAM =
  TIME_INVALIDATOR_TYPES.CardinalTimeInvalidator;

export type TimeInvalidatorData = ParsedIdlAccountData<
  "timeInvalidator",
  TIME_INVALIDATOR_PROGRAM
>;
