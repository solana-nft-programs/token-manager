import { BN, Coder } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../..";
import type { TokenManagerData } from "../tokenManager";
import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_IDL } from "../tokenManager";
import { getTokenManagers } from "../tokenManager/accounts";
import { findReceiptSlotAddress } from ".";
import { getReceiptCounter, getReceiptSlots } from "./accounts";

export const getTokenManagerIds = async (
  connection: Connection,
  issuerId: PublicKey,
  batchSize = 100
): Promise<PublicKey[]> => {
  const receiptCounterData = await getReceiptCounter(connection, issuerId);

  const count = receiptCounterData.parsed.count;

  const receiptSlotTuples = await Promise.all(
    [...Array(count).keys()].map((i) =>
      findReceiptSlotAddress(issuerId, new BN(i))
    )
  );

  // todo BN conversion here potentially
  const batches = [];
  for (let i = 0; i < count.toNumber(); i += batchSize) {
    const batchTuples = receiptSlotTuples.slice(i, i + batchSize);
    const receiptSlotIds = batchTuples.map((t) => t[0]);
    batches.push(receiptSlotIds);
  }

  const receiptSlotBatches = await Promise.all(
    batches.map((receiptSlotBatch) =>
      getReceiptSlots(connection, receiptSlotBatch)
    )
  );
  const receiptSlots = receiptSlotBatches.flat();
  return receiptSlots.map((slot) => slot.parsed.tokenManager);
};

export const getTokenManagersFromIndex = async (
  connection: Connection,
  issuerId: PublicKey,
  batchSize = 100
): Promise<AccountData<TokenManagerData>[]> => {
  const tokenManagerIds = await getTokenManagerIds(
    connection,
    issuerId,
    batchSize
  );

  const batches = [];
  for (let i = 0; i < tokenManagerIds.length; i += batchSize) {
    batches.push(tokenManagerIds.slice(i, i + batchSize));
  }

  const tokenManagerDataBatches = await Promise.all(
    batches.map((batch) => getTokenManagers(connection, batch))
  );

  return tokenManagerDataBatches.flat();
};

export const getTokenManagersForIssuerUnsafe = async (
  connection: Connection,
  issuerId: PublicKey
): Promise<AccountData<TokenManagerData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [{ memcmp: { offset: 18, bytes: issuerId.toBase58() } }],
    }
  );

  const tokenManagerDatas: AccountData<TokenManagerData>[] = [];
  const coder = new Coder(TOKEN_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tokenManagerData: TokenManagerData = coder.accounts.decode(
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
