import { Program, Provider } from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { RECEIPT_INDEX_PROGRAM, ReceiptMarkerData } from "./constants";
import { RECEIPT_INDEX_ADDRESS, RECEIPT_INDEX_IDL } from "./constants";
import { findReceiptMarkerAddress } from "./pda";

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
    parsed,
    pubkey: receiptMarkerId,
  };
};
