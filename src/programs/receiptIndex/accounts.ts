import { Program, Provider } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { ReceiptSlotData } from ".";
import type {
  RECEIPT_INDEX_PROGRAM,
  ReceiptCounterData,
  ReceiptMarkerData,
} from "./constants";
import { RECEIPT_INDEX_ADDRESS, RECEIPT_INDEX_IDL } from "./constants";
import { findReceiptCounterAddress, findReceiptMarkerAddress } from "./pda";

// TODO fix types
export const getReceiptCounter = async (
  connection: Connection,
  user: PublicKey
): Promise<AccountData<ReceiptCounterData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const receiptIndexProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptCounterId] = await findReceiptCounterAddress(user);

  const parsed = await receiptIndexProgram.account.receiptCounter.fetch(
    receiptCounterId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: receiptCounterId,
  };
};

export const getReceiptMarker = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<ReceiptMarkerData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const receiptIndexProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptMarkerId] = await findReceiptMarkerAddress(tokenManagerId);

  const parsed = await receiptIndexProgram.account.receiptMarker.fetch(
    receiptMarkerId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: receiptMarkerId,
  };
};

export const getReceiptSlots = async (
  connection: Connection,
  receiptSlotIds: PublicKey[]
): Promise<AccountData<ReceiptSlotData>[]> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const receiptIndexProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let receiptSlots = [];
  try {
    receiptSlots = await receiptIndexProgram.account.receiptSlot.fetchMultiple(
      receiptSlotIds
    );
  } catch (e) {
    console.log(e);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return receiptSlots.map((tm, i) => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    parsed: tm,
    pubkey: receiptSlotIds[i],
  }));
};
