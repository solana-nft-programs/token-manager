import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { CardinalTimeInvalidator } from "../../idl/cardinal_time_invalidator";

export type TimeInvalidatorTypes = AnchorTypes<
  CardinalTimeInvalidator,
  {
    tokenManager: TimeInvalidatorData;
  }
>;

type Accounts = TimeInvalidatorTypes["Accounts"];
export type TimeInvalidatorData = Accounts["timeInvalidator"];
