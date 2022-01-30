import type { AnchorTypes } from "@saberhq/anchor-contrib";

import type { CardinalPaidClaimApprover } from "../../idl/cardinal_paid_claim_approver";

export type ClaimApproverTypes = AnchorTypes<
  CardinalPaidClaimApprover,
  {
    tokenManager: PaidClaimApprover;
  }
>;

type Accounts = ClaimApproverTypes["Accounts"];
export type PaidClaimApprover = Accounts["paidClaimApprover"];
