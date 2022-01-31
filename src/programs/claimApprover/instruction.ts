import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type { CLAIM_APPROVER_PROGRAM } from "./constants";
import { CLAIM_APPROVER_ADDRESS, CLAIM_APPROVER_IDL } from "./constants";
import { findClaimApproverAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentManagerId: PublicKey,
  paymentAmount: number
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});

  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  const [claimApproverId, claimApproverBump] = await findClaimApproverAddress(
    tokenManagerId
  );

  return [
    claimApproverProgram.instruction.init(
      claimApproverBump,
      new BN(paymentAmount),
      {
        accounts: {
          tokenManager: tokenManagerId,
          paymentManager: paymentManagerId,
          claimApprover: claimApproverId,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    claimApproverId,
  ];
};

export const pay = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentManagerId: PublicKey,
  paymentManagerTokenAccountId: PublicKey,
  payerTokenAccountId: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});

  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  const [claimApproverId] = await findClaimApproverAddress(tokenManagerId);
  return claimApproverProgram.instruction.pay({
    accounts: {
      tokenManager: tokenManagerId,
      paymentManager: paymentManagerId,
      paymentManagerTokenAccount: paymentManagerTokenAccountId,
      claimApprover: claimApproverId,
      payer: wallet.publicKey,
      payerTokenAccount: payerTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
};
