import { Program, Provider } from "@project-serum/anchor";
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
  const provider = new Provider(connection, null, {});
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
