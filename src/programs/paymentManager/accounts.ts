import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
} from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { PaidClaimApproverData } from "../claimApprover";
import type { PAYMENT_MANAGER_PROGRAM, PaymentManagerData } from ".";
import { PAYMENT_MANAGER_ADDRESS, PAYMENT_MANAGER_IDL } from ".";
import { findPaymentManagerAddress } from "./pda";

// TODO fix types
export const getPaymentManager = async (
  connection: Connection,
  name: string
): Promise<AccountData<PaymentManagerData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new AnchorProvider(connection, null, {});
  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const [paymentManagerId] = await findPaymentManagerAddress(name);

  const parsed = await paymentManagerProgram.account.paymentManager.fetch(
    paymentManagerId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: paymentManagerId,
  };
};

export const getPaymentManagers = async (
  connection: Connection,
  paymentManagerIds: PublicKey[]
): Promise<AccountData<PaymentManagerData>[]> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new AnchorProvider(connection, null, {});
  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let paymentManagers = [];
  try {
    paymentManagers =
      await paymentManagerProgram.account.paymentManager.fetchMultiple(
        paymentManagerIds
      );
  } catch (e) {
    console.log(e);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return paymentManagers.map((tm, i) => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    parsed: tm,
    pubkey: paymentManagerIds[i],
  }));
};

export const getAllPaymentManagers = async (
  connection: Connection
): Promise<AccountData<PaymentManagerData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    PAYMENT_MANAGER_ADDRESS
  );

  const paymentManagers: AccountData<PaymentManagerData>[] = [];
  const coder = new BorshAccountsCoder(PAYMENT_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      const paymentManagerData: PaidClaimApproverData = coder.decode(
        "paymentManager",
        account.account.data
      );
      paymentManagers.push({
        ...account,
        parsed: paymentManagerData,
      });
    } catch (e) {
      console.log(`Failed to decode claim approver data`);
    }
  });
  return paymentManagers;
};
