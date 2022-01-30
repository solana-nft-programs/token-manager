import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { CardinalRentalCounter } from "../../idl/cardinal_rental_counter";

export type RentalCounterTypes = AnchorTypes<
  CardinalRentalCounter,
  {
    rentalCounter: RentalCounter;
  }
>;

type Accounts = RentalCounterTypes["Accounts"];
export type RentalCounter = Accounts["rentalCounter"];
