import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
} from "@project-serum/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type {
  CLAIM_APPROVER_PROGRAM,
  PaidClaimApproverData,
} from "./constants";
import { CLAIM_APPROVER_ADDRESS, CLAIM_APPROVER_IDL } from "./constants";
import { findClaimApproverAddress } from "./pda";

// TODO fix types
export const getClaimApprover = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<PaidClaimApproverData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new AnchorProvider(connection, null, {});
  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  const [claimApproverId] = await findClaimApproverAddress(tokenManagerId);

  const parsed = await claimApproverProgram.account.paidClaimApprover.fetch(
    claimApproverId
  );
  return {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    parsed,
    pubkey: claimApproverId,
  };
};

export const getClaimApprovers = async (
  connection: Connection,
  claimApproverIds: PublicKey[]
): Promise<AccountData<PaidClaimApproverData>[]> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new AnchorProvider(connection, null, {});
  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let claimApprovers = [];
  try {
    claimApprovers =
      await claimApproverProgram.account.paidClaimApprover.fetchMultiple(
        claimApproverIds
      );
  } catch (e) {
    console.log(e);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return claimApprovers.map((tm, i) => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    parsed: tm,
    pubkey: claimApproverIds[i],
  }));
};

export const getAllClaimApprovers = async (
  connection: Connection
): Promise<AccountData<PaidClaimApproverData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    CLAIM_APPROVER_ADDRESS
  );

  const claimApprovers: AccountData<PaidClaimApproverData>[] = [];
  const coder = new BorshAccountsCoder(CLAIM_APPROVER_IDL);
  programAccounts.forEach((account) => {
    try {
      const claimApproverData: PaidClaimApproverData = coder.decode(
        "paidClaimApprover",
        account.account.data
      );
      claimApprovers.push({
        ...account,
        parsed: claimApproverData,
      });
    } catch (e) {
      console.log(`Failed to decode claim approver data`);
    }
  });
  return claimApprovers;
};
