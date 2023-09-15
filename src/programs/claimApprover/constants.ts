import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { ParsedIdlAccountData } from "@solana-nft-programs/common";
import { emptyWallet } from "@solana-nft-programs/common";
import { DEFAULT_PAYMENT_MANAGER_NAME } from "@solana-nft-programs/payment-manager";
import { findPaymentManagerAddress } from "@solana-nft-programs/payment-manager/dist/cjs/pda";

import * as CLAIM_APPROVER_TYPES from "../../idl/solana_nft_programs_paid_claim_approver";

export const CLAIM_APPROVER_ADDRESS = new PublicKey(
  "pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR"
);

export const CLAIM_APPROVER_SEED = "paid-claim-approver";

export const CLAIM_APPROVER_IDL = CLAIM_APPROVER_TYPES.IDL;

export type CLAIM_APPROVER_PROGRAM =
  CLAIM_APPROVER_TYPES.SolanaNftProgramsPaidClaimApprover;

export type PaidClaimApproverData = ParsedIdlAccountData<
  "paidClaimApprover",
  CLAIM_APPROVER_PROGRAM
>;

export const defaultPaymentManagerId = findPaymentManagerAddress(
  DEFAULT_PAYMENT_MANAGER_NAME
);

export type ClaimApproverParams = {
  paymentMint: PublicKey;
  paymentAmount: number;
  collector?: PublicKey;
  paymentManager?: PublicKey;
};

export const claimApproverProgram = (
  connection: Connection,
  wallet?: Wallet,
  confirmOptions?: ConfirmOptions
) => {
  return new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    new AnchorProvider(
      connection,
      wallet ?? emptyWallet(Keypair.generate().publicKey),
      confirmOptions ?? {}
    )
  );
};
