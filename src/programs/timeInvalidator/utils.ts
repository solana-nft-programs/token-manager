import { BN } from "@project-serum/anchor";

import type { AccountData } from "../..";
import type { TokenManagerData } from "../tokenManager";
import { TokenManagerState } from "../tokenManager";
import type { TimeInvalidatorData } from ".";

export const shouldTimeInvalidate = (
  tokenManagerData: AccountData<TokenManagerData>,
  timeInvalidatorData: AccountData<TimeInvalidatorData>
): boolean => {
  return Boolean(
    tokenManagerData?.parsed.state !== TokenManagerState.Invalidated &&
      ((timeInvalidatorData.parsed.maxExpiration &&
        new BN(Date.now() / 1000).gte(
          timeInvalidatorData.parsed.maxExpiration
        )) ||
        (timeInvalidatorData.parsed.expiration &&
          tokenManagerData.parsed.state === TokenManagerState.Claimed &&
          new BN(Date.now() / 1000).gte(
            timeInvalidatorData.parsed.expiration
          )) ||
        (!timeInvalidatorData.parsed.expiration &&
          tokenManagerData.parsed.state === TokenManagerState.Claimed &&
          timeInvalidatorData.parsed.durationSeconds &&
          new BN(Date.now() / 1000).gte(
            tokenManagerData.parsed.stateChangedAt.add(
              timeInvalidatorData.parsed.durationSeconds
            )
          )))
  );
};
