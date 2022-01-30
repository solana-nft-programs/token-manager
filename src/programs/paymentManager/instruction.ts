import { Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type { PAYMENT_MANAGER_PROGRAM } from "./constants";
import { PAYMENT_MANAGER_ADDRESS, PAYMENT_MANAGER_IDL } from "./constants";
import { findPaymentManagerAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentMint: PublicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const [paymentManagerId, paymentManagerBump] =
    await findPaymentManagerAddress(tokenManagerId);

  return [
    paymentManagerProgram.instruction.init(paymentManagerBump, {
      accounts: {
        tokenManager: tokenManagerId,
        paymentManager: paymentManagerId,
        paymentMint: paymentMint,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }),
    paymentManagerId,
  ];
};
