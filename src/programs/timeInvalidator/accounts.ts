import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { TIME_INVALIDATOR_PROGRAM } from "./constants";

export type TimeInvalidatorTypes = AnchorTypes<
  TIME_INVALIDATOR_PROGRAM,
  {
    tokenManager: TimeInvalidatorData;
  }
>;

type Accounts = TimeInvalidatorTypes["Accounts"];
export type TimeInvalidatorData = Accounts["timeInvalidator"];
