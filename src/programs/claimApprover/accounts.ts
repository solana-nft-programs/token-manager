import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { CLAIM_APPROVER_PROGRAM } from "./constants";

export type ClaimApproverTypes = AnchorTypes<
  CLAIM_APPROVER_PROGRAM,
  {
    tokenManager: PaidClaimApprover;
  }
>;

type Accounts = ClaimApproverTypes["Accounts"];
export type PaidClaimApprover = Accounts["paidClaimApprover"];
