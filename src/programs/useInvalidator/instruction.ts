import { AnchorProvider, BN, Program } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

import {
  DEFAULT_PAYMENT_MANAGER_NAME,
  PAYMENT_MANAGER_ADDRESS,
} from "../paymentManager";
import { findPaymentManagerAddress } from "../paymentManager/pda";
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
  paymentManager?: PublicKey;
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
  params: UseInvalidationParams
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [useInvalidatorId, _useInvalidatorBump] =
    await findUseInvalidatorAddress(tokenManagerId);

  const [defaultPaymentManagerId] = await findPaymentManagerAddress(
    DEFAULT_PAYMENT_MANAGER_NAME
  );

  return [
    useInvalidatorProgram.instruction.init(
      {
        collector: params.collector || CRANK_KEY,
        paymentManager: params.paymentManager || defaultPaymentManagerId,
        totalUsages: params.totalUsages ? new BN(params.totalUsages) : null,
        maxUsages: params.extension?.maxUsages
          ? new BN(params.extension?.maxUsages)
          : null,
        useAuthority: params.useAuthority || null,
        extensionPaymentAmount: params.extension?.extensionPaymentAmount
          ? new BN(params.extension?.extensionPaymentAmount)
          : null,
        extensionPaymentMint: params.extension?.extensionPaymentMint || null,
        extensionUsages: params.extension?.extensionUsages
          ? new BN(params.extension?.extensionUsages)
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
  const provider = new AnchorProvider(connection, wallet, {});

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
  const provider = new AnchorProvider(connection, wallet, {});

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
      rent: SYSVAR_RENT_PUBKEY,
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
  paymentManager: PublicKey,
  payerTokenAccountId: PublicKey,
  useInvalidatorId: PublicKey,
  usagesToAdd: number,
  paymentAccounts: [PublicKey, PublicKey, AccountMeta[]]
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const useInvalidatorProgram = new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    provider
  );

  const [paymentTokenAccountId, feeCollectorTokenAccount, remainingAccounts] =
    paymentAccounts;
  return useInvalidatorProgram.instruction.extendUsages(new BN(usagesToAdd), {
    accounts: {
      tokenManager: tokenManagerId,
      useInvalidator: useInvalidatorId,
      paymentManager: paymentManager,
      paymentTokenAccount: paymentTokenAccountId,
      feeCollectorTokenAccount: feeCollectorTokenAccount,
      payer: wallet.publicKey,
      payerTokenAccount: payerTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
      cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
    },
    remainingAccounts,
  });
};

export const close = (
  connection: Connection,
  wallet: Wallet,
  useInvalidatorId: PublicKey,
  tokenManagerId: PublicKey,
  collector?: PublicKey
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

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
