import { BorshAccountsCoder } from "@coral-xyz/anchor";
import type { Connection, PublicKey } from "@solana/web3.js";
import type { AccountData } from "@solana-nft-programs/common";

import type { PaidClaimApproverData } from "./constants";
import {
  CLAIM_APPROVER_ADDRESS,
  CLAIM_APPROVER_IDL,
  claimApproverProgram,
} from "./constants";
import { findClaimApproverAddress } from "./pda";

export const getClaimApprover = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<PaidClaimApproverData>> => {
  const program = claimApproverProgram(connection);
  const claimApproverId = findClaimApproverAddress(tokenManagerId);

  const parsed = await program.account.paidClaimApprover.fetch(claimApproverId);
  return {
    parsed,
    pubkey: claimApproverId,
  };
};

export const getClaimApprovers = async (
  connection: Connection,
  claimApproverIds: PublicKey[]
): Promise<AccountData<PaidClaimApproverData | null>[]> => {
  const program = claimApproverProgram(connection);
  let claimApprovers: (PaidClaimApproverData | null)[] = [];
  try {
    claimApprovers = (await program.account.paidClaimApprover.fetchMultiple(
      claimApproverIds
    )) as (PaidClaimApproverData | null)[];
  } catch (e) {
    console.log(e);
  }
  return claimApprovers.map((tm, i) => ({
    parsed: tm,
    pubkey: claimApproverIds[i]!,
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
