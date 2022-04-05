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
import {
  CRANK_KEY,
  TOKEN_MANAGER_ADDRESS,
  TokenManagerState,
} from "../tokenManager";
import { getRemainingAccountsForKind } from "../tokenManager/utils";
import type { USE_INVALIDATOR_PROGRAM } from "./constants";
import { USE_INVALIDATOR_ADDRESS, USE_INVALIDATOR_IDL } from "./constants";
import { findUseInvalidatorAddress } from "./pda";

export type UseInvalidationParams = {
  collector?: PublicKey;
  totalUsages?: number;
  useAuthority?: PublicKey;
  extension?: {
    extensionUsages: number;
    extensionPaymentMint: PublicKey;
    extensionPaymentAmount: number;
    maxUsages?: number;
  };
};

export const init = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  usageParams: UseInvalidationParams
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [useInvalidatorId, _useInvalidatorBump] =
    await findUseInvalidatorAddress(tokenManagerId);

  return [
    useInvalidatorProgram.instruction.init(
      {
        collector: usageParams.collector || CRANK_KEY,
        totalUsages: usageParams.totalUsages
          ? new BN(usageParams.totalUsages)
          : null,
        maxUsages: usageParams.extension?.maxUsages
          ? new BN(usageParams.extension?.maxUsages)
          : null,
        useAuthority: usageParams.useAuthority || null,
        extensionPaymentAmount: usageParams.extension?.extensionPaymentAmount
          ? new BN(usageParams.extension?.extensionPaymentAmount)
          : null,
        extensionPaymentMint:
          usageParams.extension?.extensionPaymentMint || null,
        extensionUsages: usageParams.extension?.extensionUsages
          ? new BN(usageParams.extension?.extensionUsages)
          : null,
      },
      {
        accounts: {
          tokenManager: tokenManagerId,
          useInvalidator: useInvalidatorId,
          issuer: wallet.publicKey,
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
  recipientTokenAccountId: PublicKey,
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
      recipientTokenAccount: recipientTokenAccountId,
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
  tokenManagerState: TokenManagerState,
  tokenManagerTokenAccountId: PublicKey,
  recipientTokenAccountId: PublicKey,
  returnAccounts: AccountMeta[]
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [[useInvalidatorId], transferAccounts] = await Promise.all([
    findUseInvalidatorAddress(tokenManagerId),
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
    },
    remainingAccounts: [
      ...(tokenManagerState === TokenManagerState.Claimed
        ? transferAccounts
        : []),
      ...returnAccounts,
    ],
  });
};

export const extendUsages = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  payerTokenAccountId: PublicKey,
  useInvalidatorId: PublicKey,
  extensionPaymentAmount: number,
  paymentAccounts: [PublicKey, PublicKey, AccountMeta[]]
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [
    paymentTokenAccountId,
    paymentManagerTokenAccountId,
    remainingAccounts,
  ] = paymentAccounts;
  return useInvalidatorProgram.instruction.extendUsages(
    new BN(extensionPaymentAmount),
    {
      accounts: {
        tokenManager: tokenManagerId,
        useInvalidator: useInvalidatorId,
        paymentTokenAccount: paymentTokenAccountId,
        paymentManagerTokenAccount: paymentManagerTokenAccountId,
        payer: wallet.publicKey,
        payerTokenAccount: payerTokenAccountId,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      remainingAccounts,
    }
  );
};

export const close = (
  connection: Connection,
  wallet: Wallet,
  useInvalidatorId: PublicKey,
  tokenManagerId: PublicKey,
  collector?: PublicKey
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
      collector: collector || CRANK_KEY,
      closer: wallet.publicKey,
    },
  });
};
