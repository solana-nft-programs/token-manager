import { BorshAccountsCoder } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../..";
import type { TokenManagerData } from "../tokenManager";
import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_IDL } from "../tokenManager";

export const getTokenManagersForIssuerUnsafe = async (
  connection: Connection,
  issuerId: PublicKey
): Promise<AccountData<TokenManagerData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [{ memcmp: { offset: 19, bytes: issuerId.toBase58() } }],
    }
  );

  const tokenManagerDatas: AccountData<TokenManagerData>[] = [];
  const coder = new BorshAccountsCoder(TOKEN_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tokenManagerData: TokenManagerData = coder.decode(
        "tokenManager",
        account.account.data
      );
      if (tokenManagerData) {
        tokenManagerDatas.push({
          ...account,
          parsed: tokenManagerData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode token manager data`);
    }
  });

  return tokenManagerDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};

export const getTokenManagersForIssuer = async (
  connection: Connection,
  issuerId: PublicKey,
  _batchSize = 100,
  fromIndex = false
): Promise<AccountData<TokenManagerData>[]> => {
  if (fromIndex) {
    throw new Error("not implemented");
  } else {
    return getTokenManagersForIssuerUnsafe(connection, issuerId);
  }
};
