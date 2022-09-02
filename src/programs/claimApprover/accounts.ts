import {
  AnchorProvider,
  BorshAccountsCoder,
  Program,
} from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type {
  CLAIM_APPROVER_PROGRAM,
  PaidClaimApproverData,
} from "./constants";
import { CLAIM_APPROVER_ADDRESS, CLAIM_APPROVER_IDL } from "./constants";
import { findClaimApproverAddress } from "./pda";

export const getClaimApprover = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<PaidClaimApproverData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
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
    parsed,
    pubkey: claimApproverId,
  };
};

export const getClaimApprovers = async (
  connection: Connection,
  claimApproverIds: PublicKey[]
): Promise<AccountData<PaidClaimApproverData>[]> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  let claimApprovers: (PaidClaimApproverData | null)[] = [];
  try {
    claimApprovers =
      (await claimApproverProgram.account.paidClaimApprover.fetchMultiple(
        claimApproverIds
      )) as (PaidClaimApproverData | null)[];
  } catch (e) {
    console.log(e);
  }
  return claimApprovers.map((tm, i) => ({
    parsed: tm!,
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
