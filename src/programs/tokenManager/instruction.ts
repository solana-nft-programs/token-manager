import { Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type { TOKEN_MANAGER_PROGRAM } from "./constants";
import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_IDL } from "./constants";
import { findTokenManagerAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  seed: Uint8Array
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const [tokenManagerId, tokenManagerBump] = await findTokenManagerAddress(
    wallet.publicKey,
    seed
  );

  return [
    tokenManagerProgram.instruction.init(
      Buffer.from(seed),
      tokenManagerBump,
      1,
      {
        accounts: {
          tokenManager: tokenManagerId,
          issuer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    tokenManagerId,
  ];
};

export const setPaymetManager = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentManagerId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.setPaymentManager(paymentManagerId, {
    accounts: {
      tokenManager: tokenManagerId,
      issuer: wallet.publicKey,
    },
  });
};
