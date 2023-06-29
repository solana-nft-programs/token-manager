import type { AccountData } from "@cardinal/common";
import { chunkArray } from "@cardinal/common";
import dotenv from "dotenv";

import type { TimeInvalidatorData } from "../src/programs/timeInvalidator";
import { getAllTimeInvalidators } from "../src/programs/timeInvalidator/accounts";
import type { TokenManagerData } from "../src/programs/tokenManager";
import { getTokenManagers } from "../src/programs/tokenManager/accounts";
import { connectionFor } from "./connection";

dotenv.config();

export const main = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const timeInvalidators = await getAllTimeInvalidators(connection);

  const allTokenManagerIds = timeInvalidators.map(
    (timeInvalidator) => timeInvalidator.parsed.tokenManager
  );
  const tokenManagerIdChunks = chunkArray(allTokenManagerIds, 100);
  console.log(`> Looking up ${timeInvalidators.length} token managers`);

  const tokenManagers: AccountData<TokenManagerData>[] = [];
  for (let i = 0; i < tokenManagerIdChunks.length; i++) {
    const tokenManagerIds = tokenManagerIdChunks[i]!;
    console.log(
      `>> [${i}/${
        tokenManagerIdChunks.length - 1
      }] batch token manager lookup [${tokenManagerIds.length}]`
    );
    const singleBatch = (
      await getTokenManagers(connection, tokenManagerIds)
    ).filter((x): x is AccountData<TokenManagerData> => x.parsed !== null);
    tokenManagers.push(...singleBatch);
    await new Promise((r) => setTimeout(r, 100));
  }
  const tokenManagersById = tokenManagers.reduce((acc, tm) => {
    acc[tm.pubkey?.toString()] = tm;
    return acc;
  }, {} as { [str: string]: AccountData<TokenManagerData> });

  console.log(timeInvalidators.length);
  console.log(
    JSON.stringify(
      timeInvalidators
        .sort(
          (a, b) =>
            minExpiration(b, tokenManagersById) -
            minExpiration(a, tokenManagersById)
        )
        .map((ti) => ({
          t: minExpiration(ti, tokenManagersById),
          s: tokenManagersById[ti.parsed.tokenManager.toString()]?.parsed.state,
        }))
        .reverse()
    )
  );
};

const minExpiration = (
  timeInvalidator: AccountData<TimeInvalidatorData>,
  tokenManagerdsById: { [str: string]: AccountData<TokenManagerData> }
) => {
  return timeInvalidator.parsed.expiration
    ? timeInvalidator.parsed.expiration?.toNumber() ?? 0
    : timeInvalidator.parsed.durationSeconds
    ? (tokenManagerdsById[
        timeInvalidator.parsed.tokenManager.toString()
      ]?.parsed.stateChangedAt.toNumber() ?? 0) +
      timeInvalidator.parsed.durationSeconds?.toNumber()
    : 0;
};

main("mainnet-beta").catch((e) => console.log(e));
