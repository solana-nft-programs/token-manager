import { PublicKey } from "@solana/web3.js";

import { IDL } from "../../idl/cardinal_rental_counter";

export const RENTAL_COUNTER_ADDRESS = new PublicKey(
  "cntQPZbfxBeLa8HVBbA4fApyAKh8mUxUVeaCjBLFSFP"
);

export const RENTAL_COUNTER_SEED = "rental-counter";

export const RENTAL_COUNTER_IDL = IDL;
