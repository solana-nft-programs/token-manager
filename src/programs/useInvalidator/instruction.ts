import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

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
