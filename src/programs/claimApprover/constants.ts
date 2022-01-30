import { PublicKey } from "@solana/web3.js";

import * as CLAIM_APPROVER_TYPES from "../../idl/cardinal_paid_claim_approver";

export const CLAIM_APPROVER_ADDRESS = new PublicKey(
  "pcaQ9jQLzb8VszyM6oPRoiGsdjizxMyvGjauhKPD5EF"
);

export const CLAIM_APPROVER_SEED = "paid-claim-approver";

export const CLAIM_APPROVER_IDL = CLAIM_APPROVER_TYPES.IDL;

export type CLAIM_APPROVER_PROGRAM =
  CLAIM_APPROVER_TYPES.CardinalPaidClaimApprover;
