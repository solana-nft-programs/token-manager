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

import type { TokenManagerKind } from "../tokenManager";
import { TOKEN_MANAGER_ADDRESS, TokenManagerState } from "../tokenManager";
import {
  getRemainingAccountsForKind,
  getRemainingAccountsForPayment,
} from "../tokenManager/utils";
import type { TIME_INVALIDATOR_PROGRAM } from "./constants";
import { TIME_INVALIDATOR_ADDRESS, TIME_INVALIDATOR_IDL } from "./constants";
import { findTimeInvalidatorAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  duration: number,
  startOnInit?: boolean
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});

  const timeInvalidatorProgram = new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    provider
  );

  const [timeInvalidatorId, _timeInvalidatorBump] =
    await findTimeInvalidatorAddress(tokenManagerId);

  return [
    timeInvalidatorProgram.instruction.init(
      new BN(duration),
      startOnInit || false,
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

export const setExpiration = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  timeInvalidatorId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});

  const timeInvalidatorProgram = new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    provider
  );

  return timeInvalidatorProgram.instruction.setExpiration({
    accounts: {
      tokenManager: tokenManagerId,
      timeInvalidator: timeInvalidatorId,
    },
  });
};

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  tokenManagerId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  tokenManagerState: TokenManagerState,
  tokenManagerTokenAccountId: PublicKey,
  recipientTokenAccountId: PublicKey,
  returnAccounts: AccountMeta[],
  issuerPaymentMintTokenAccountId?: PublicKey | null,
  tokenManagerPaymentMint?: PublicKey | null
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});

  const timeInvalidatorProgram = new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    provider
  );

  const [[timeInvalidatorId], paymentAccounts, transferAccounts] =
    await Promise.all([
      findTimeInvalidatorAddress(tokenManagerId),
      getRemainingAccountsForPayment(
        tokenManagerId,
        issuerPaymentMintTokenAccountId,
        tokenManagerPaymentMint
      ),
      getRemainingAccountsForKind(mintId, tokenManagerKind),
    ]);

  return timeInvalidatorProgram.instruction.invalidate({
    accounts: {
      tokenManager: tokenManagerId,
      timeInvalidator: timeInvalidatorId,
      invalidator: wallet.publicKey,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      mint: mintId,
      recipientTokenAccount: recipientTokenAccountId,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    remainingAccounts: [
      ...paymentAccounts,
      ...(tokenManagerState === TokenManagerState.Claimed
        ? transferAccounts
        : []),
      ...returnAccounts,
    ],
  });
};

export const close = (
  connection: Connection,
  wallet: Wallet,
  timeInvalidatorId: PublicKey,
  tokenManagerId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});

  const timeInvalidatorProgram = new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    provider
  );

  return timeInvalidatorProgram.instruction.close({
    accounts: {
      tokenManager: tokenManagerId,
      timeInvalidator: timeInvalidatorId,
      closer: wallet.publicKey,
    },
  });
};
