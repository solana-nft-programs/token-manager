import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { PAYMENT_MANAGER_PROGRAM } from "./constants";

export type PaymentManagerTypes = AnchorTypes<
  PAYMENT_MANAGER_PROGRAM,
  {
    tokenManager: PaymentManagerData;
  }
>;

type Accounts = PaymentManagerTypes["Accounts"];
export type PaymentManagerData = Accounts["paymentManager"];
