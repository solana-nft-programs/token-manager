import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type { TokenManagerKind } from "../tokenManager";
import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import {
  getRemainingAccountsForKind,
  getRemainingAccountsForPayment,
} from "../tokenManager/utils";
import type { USE_INVALIDATOR_PROGRAM } from "./constants";
import { USE_INVALIDATOR_ADDRESS, USE_INVALIDATOR_IDL } from "./constants";
import { findUseInvalidatorAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  usages: number | null
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [useInvalidatorId, useInvalidatorBump] =
    await findUseInvalidatorAddress(tokenManagerId);

  return [
    useInvalidatorProgram.instruction.init(
      useInvalidatorBump,
      usages ? new BN(usages) : null,
      {
        accounts: {
          tokenManager: tokenManagerId,
          useInvalidator: useInvalidatorId,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    useInvalidatorId,
  ];
};

export const incrementUsages = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  usages: number
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [useInvalidatorId] = await findUseInvalidatorAddress(tokenManagerId);

  return useInvalidatorProgram.instruction.incrementUsages(new BN(usages), {
    accounts: {
      tokenManager: tokenManagerId,
      useInvalidator: useInvalidatorId,
      user: wallet.publicKey,
    },
  });
};

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  tokenManagerId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  tokenManagerTokenAccountId: PublicKey,
  recipientTokenAccountId: PublicKey,
  issuerTokenAccountId: PublicKey,
  issuerPaymentMintTokenAccountId?: PublicKey | null,
  tokenManagerPaymentMint?: PublicKey | null
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [[useInvalidatorId], paymentAccounts, transferAccounts] =
    await Promise.all([
      findUseInvalidatorAddress(tokenManagerId),
      getRemainingAccountsForPayment(
        tokenManagerId,
        issuerPaymentMintTokenAccountId,
        tokenManagerPaymentMint
      ),
      getRemainingAccountsForKind(mintId, tokenManagerKind),
    ]);

  return useInvalidatorProgram.instruction.invalidate({
    accounts: {
      tokenManager: tokenManagerId,
      useInvalidator: useInvalidatorId,
      invalidator: wallet.publicKey,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
      mint: mintId,
      recipientTokenAccount: recipientTokenAccountId,
      issuerTokenAccount: issuerTokenAccountId,
    },
    remainingAccounts: [...paymentAccounts, ...transferAccounts],
  });
};

export const close = (
  connection: Connection,
  wallet: Wallet,
  useInvalidatorId: PublicKey,
  tokenManagerId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  return useInvalidatorProgram.instruction.close({
    accounts: {
      tokenManager: tokenManagerId,
      useInvalidator: useInvalidatorId,
      closer: wallet.publicKey,
    },
  });
};
