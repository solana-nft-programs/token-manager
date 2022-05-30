import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as PAYMENT_MANAGER_TYPES from "../../idl/cardinal_payment_manager";

export const PAYMENT_MANAGER_ADDRESS = new PublicKey(
  "pmvYY6Wgvpe3DEj3UX1FcRpMx43sMLYLJrFTVGcqpdn"
);

export const PAYMENT_MANAGER_SEED = "payment-manager";

export const PAYMENT_MANAGER_IDL = PAYMENT_MANAGER_TYPES.IDL;

export type PAYMENT_MANAGER_PROGRAM =
  PAYMENT_MANAGER_TYPES.CardinalPaymentManager;

export type PaymentManagerTypes = AnchorTypes<
  PAYMENT_MANAGER_PROGRAM,
  {
    tokenManager: PaymentManagerData;
  }
>;

type Accounts = PaymentManagerTypes["Accounts"];
export type PaymentManagerData = Accounts["paymentManager"];
