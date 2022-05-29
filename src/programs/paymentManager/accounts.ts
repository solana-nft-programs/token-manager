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

export const getPaymentManager = async (
  connection: Connection,
  paymentManagerId: PublicKey
): Promise<AccountData<PaymentManagerData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new AnchorProvider(connection, null, {});
  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const parsed = await paymentManagerProgram.account.paymentManager.fetch(
    paymentManagerId
  );
  return {
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

  let paymentManagers: (PaymentManagerData | null)[] = [];
  try {
    paymentManagers =
      (await paymentManagerProgram.account.paymentManager.fetchMultiple(
        paymentManagerIds
      )) as (PaymentManagerData | null)[];
  } catch (e) {
    console.log(e);
  }

  return paymentManagers.reduce(
    (acc, tm, i) =>
      tm ? [...acc, { parsed: tm, pubkey: paymentManagerIds[i]! }] : acc,
    [] as AccountData<PaymentManagerData>[]
  );
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
