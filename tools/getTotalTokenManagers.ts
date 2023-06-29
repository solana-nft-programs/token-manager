import { BorshAccountsCoder, utils } from "@project-serum/anchor";
import dotenv from "dotenv";

import { TIME_INVALIDATOR_ADDRESS } from "../src/programs/timeInvalidator";
import type { TokenManagerData } from "../src/programs/tokenManager";
import {
  TOKEN_MANAGER_ADDRESS,
  TOKEN_MANAGER_IDL,
} from "../src/programs/tokenManager";
import { connectionFor } from "./connection";

dotenv.config();

export const main = async (cluster: string) => {
  const connection = connectionFor(cluster);
  const timeInvalidatorAccounts = await connection.getProgramAccounts(
    TIME_INVALIDATOR_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("timeInvalidator")
            ),
          },
        },
      ],
    }
  );
  console.log(timeInvalidatorAccounts.length);

  const tokenManagerAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("tokenManager")
            ),
          },
        },
      ],
    }
  );
  const coder = new BorshAccountsCoder(TOKEN_MANAGER_IDL);
  const tokenManagers: TokenManagerData[] = [];
  tokenManagerAccounts.forEach((account) => {
    try {
      const entry = coder.decode<TokenManagerData>(
        "tokenManager",
        account.account.data
      );
      tokenManagers.push(entry);
    } catch (e) {
      console.log(`Failed to decode ${account.pubkey.toString()}`);
    }
  });

  console.log(tokenManagerAccounts.length, tokenManagers.length);
};

main("mainnet-beta").catch((e) => console.log(e));
