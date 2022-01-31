import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type { TIME_INVALIDATOR_PROGRAM } from "./constants";
import { TIME_INVALIDATOR_ADDRESS, TIME_INVALIDATOR_IDL } from "./constants";
import { findTimeInvalidatorAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  expiration: number
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});

  const timeInvalidatorProgram = new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    provider
  );

  const [timeInvalidatorId, timeInvalidatorBump] =
    await findTimeInvalidatorAddress(tokenManagerId);

  return [
    timeInvalidatorProgram.instruction.init(
      timeInvalidatorBump,
      new BN(expiration),
      {
        accounts: {
          tokenManager: tokenManagerId,
          timeInvalidator: timeInvalidatorId,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    timeInvalidatorId,
  ];
};
