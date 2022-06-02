import { BN } from "@project-serum/anchor";

import type { AccountData } from "../..";
import type { TokenManagerData } from "../tokenManager";
import { TokenManagerState } from "../tokenManager";
import type { TimeInvalidatorData } from ".";

export const shouldTimeInvalidate = (
  tokenManagerData: AccountData<TokenManagerData>,
  timeInvalidatorData: AccountData<TimeInvalidatorData>,
  UTCNow: number = Date.now() / 1000
): boolean => {
  return Boolean(
    tokenManagerData?.parsed.state !== TokenManagerState.Invalidated &&
      ((timeInvalidatorData.parsed.maxExpiration &&
        new BN(UTCNow).gte(timeInvalidatorData.parsed.maxExpiration)) ||
        (timeInvalidatorData.parsed.expiration &&
          tokenManagerData.parsed.state === TokenManagerState.Claimed &&
          new BN(UTCNow).gte(timeInvalidatorData.parsed.expiration)) ||
        (!timeInvalidatorData.parsed.expiration &&
          tokenManagerData.parsed.state === TokenManagerState.Claimed &&
          timeInvalidatorData.parsed.durationSeconds &&
          new BN(UTCNow).gte(
            tokenManagerData.parsed.stateChangedAt.add(
              timeInvalidatorData.parsed.durationSeconds
            )
          )))
  );
};
