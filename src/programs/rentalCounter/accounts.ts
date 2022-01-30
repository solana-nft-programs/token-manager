import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { RENTAL_COUNTER_PROGRAM } from "./constants";

export type RentalCounterTypes = AnchorTypes<
  RENTAL_COUNTER_PROGRAM,
  {
    rentalCounter: RentalCounter;
  }
>;

type Accounts = RentalCounterTypes["Accounts"];
export type RentalCounter = Accounts["rentalCounter"];
