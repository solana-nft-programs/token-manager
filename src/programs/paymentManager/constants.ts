import { PublicKey } from "@solana/web3.js";

import * as PAYMENT_MANAGER_TYPES from "../../idl/cardinal_payment_manager";

export const PAYMENT_MANAGER_ADDRESS = new PublicKey(
  "cpmTAQfUopUzqu2BAR5EfnUfqJSgZkMoU7QBvkueyEn"
);

export const PAYMENT_MANAGER_SEED = "payment-manager";

export const PAYMENT_MANAGER_IDL = PAYMENT_MANAGER_TYPES.IDL;

export type PAYMENT_MANAGER_PROGRAM =
  PAYMENT_MANAGER_TYPES.CardinalPaymentManager;
