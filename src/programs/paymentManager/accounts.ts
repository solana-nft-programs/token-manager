import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { CardinalPaymentManager } from "../../types/cardinal_payment_manager";

export type PaymentManagerTypes = AnchorTypes<
  CardinalPaymentManager,
  {
    tokenManager: PaymentManagerData;
  }
>;

type Accounts = PaymentManagerTypes["Accounts"];
export type PaymentManagerData = Accounts["paymentManager"];
