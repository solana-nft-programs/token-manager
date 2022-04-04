import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import { findClaimReceiptId } from "../tokenManager/pda";
import type { CLAIM_APPROVER_PROGRAM } from "./constants";
import { CLAIM_APPROVER_ADDRESS, CLAIM_APPROVER_IDL } from "./constants";
import { findClaimApproverAddress } from "./pda";

export type ClaimApproverParams = {
  paymentMint: PublicKey;
  paymentAmount: number;
  collector?: PublicKey;
};

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  claimApproverParams: ClaimApproverParams
): Promise<[TransactionInstruction, PublicKey]> => {
  const { paymentMint, paymentAmount, collector } = claimApproverParams;
  const provider = new Provider(connection, wallet, {});

  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  const [claimApproverId, _claimApproverBump] = await findClaimApproverAddress(
    tokenManagerId
  );

  return [
    claimApproverProgram.instruction.init(
      paymentMint,
      new BN(paymentAmount),
      collector || wallet.publicKey,
      {
        accounts: {
          tokenManager: tokenManagerId,
          claimApprover: claimApproverId,
          issuer: wallet.publicKey,
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
  payerTokenAccountId: PublicKey,
  paymentAccounts: [PublicKey, PublicKey, AccountMeta[]]
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});

  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  const [claimReceiptId, _claimReceiptBump] = await findClaimReceiptId(
    tokenManagerId,
    wallet.publicKey
  );

  const [claimApproverId] = await findClaimApproverAddress(tokenManagerId);
  const [
    paymentTokenAccountId,
    paymentManagerTokenAccountId,
    remainingAccounts,
  ] = paymentAccounts;
  return claimApproverProgram.instruction.pay({
    accounts: {
      tokenManager: tokenManagerId,
      paymentTokenAccount: paymentTokenAccountId,
      claimApprover: claimApproverId,
      payer: wallet.publicKey,
      payerTokenAccount: payerTokenAccountId,
      paymentManagerTokenAccount: paymentManagerTokenAccountId,
      claimReceipt: claimReceiptId,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    },
    remainingAccounts,
  });
};

export const close = (
  connection: Connection,
  wallet: Wallet,
  claimApproverId: PublicKey,
  tokenManagerId: PublicKey,
  collector?: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});

  const claimApproverProgram = new Program<CLAIM_APPROVER_PROGRAM>(
    CLAIM_APPROVER_IDL,
    CLAIM_APPROVER_ADDRESS,
    provider
  );

  return claimApproverProgram.instruction.close({
    accounts: {
      tokenManager: tokenManagerId,
      claimApprover: claimApproverId,
      collector: collector || wallet.publicKey,
      closer: wallet.publicKey,
    },
  });
};
