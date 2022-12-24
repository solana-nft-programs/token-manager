import type { AccountData } from "@cardinal/common";
import { BN } from "@project-serum/anchor";

import type { TokenManagerData } from "../tokenManager";
import { TokenManagerState } from "../tokenManager";
import type { TimeInvalidatorData } from ".";

export const shouldTimeInvalidate = (
  tokenManagerData: AccountData<TokenManagerData>,
  timeInvalidatorData: AccountData<TimeInvalidatorData>,
  UTCNow: number = Date.now() / 1000
): boolean => {
  const invalidators = tokenManagerData.parsed.invalidators.map((i) =>
    i.toString()
  );
  return (
    invalidators.includes(timeInvalidatorData.pubkey.toString()) &&
    tokenManagerData?.parsed.state !== TokenManagerState.Invalidated &&
    tokenManagerData?.parsed.state !== TokenManagerState.Initialized &&
    ((timeInvalidatorData.parsed.maxExpiration &&
      new BN(UTCNow).gte(timeInvalidatorData.parsed.maxExpiration)) ||
      (timeInvalidatorData.parsed.expiration &&
        tokenManagerData.parsed.state === TokenManagerState.Claimed &&
        new BN(UTCNow).gte(timeInvalidatorData.parsed.expiration)) ||
      (!timeInvalidatorData.parsed.expiration &&
        tokenManagerData.parsed.state === TokenManagerState.Claimed &&
        !!timeInvalidatorData.parsed.durationSeconds &&
        new BN(UTCNow).gte(
          tokenManagerData.parsed.stateChangedAt.add(
            timeInvalidatorData.parsed.durationSeconds
          )
        )))
  );
};
