import type { BN } from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type {
  InvalidationType,
  TOKEN_MANAGER_PROGRAM,
  TokenManagerKind,
} from "./constants";
import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_IDL } from "./constants";
import {
  findClaimReceiptId,
  findMintCounterId,
  findMintManagerId,
  findTokenManagerAddress,
} from "./pda";
import { getRemainingAccountsForKind } from "./utils";

export const initMintCounter = async (
  connection: Connection,
  wallet: Wallet,
  mint: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );
  const [mintCounterId, mintCounterBump] = await findMintCounterId(mint);
  return tokenManagerProgram.instruction.initMintCounter(
    mintCounterBump,
    mint,
    {
      accounts: {
        mintCounter: mintCounterId,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }
  );
};

export const init = async (
  connection: Connection,
  wallet: Wallet,
  mint: PublicKey,
  issuerTokenAccountId: PublicKey,
  numInvalidator = 1
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const [tokenManagerId, tokenManagerBump] = await findTokenManagerAddress(
    mint
  );

  return [
    tokenManagerProgram.instruction.init(
      tokenManagerBump,
      mint,
      numInvalidator,
      {
        accounts: {
          tokenManager: tokenManagerId,
          issuer: wallet.publicKey,
          issuerTokenAccount: issuerTokenAccountId,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    tokenManagerId,
  ];
};

export const setPaymentMint = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  paymentMint: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.setPaymentMint(paymentMint, {
    accounts: {
      tokenManager: tokenManagerId,
      issuer: wallet.publicKey,
    },
  });
};

export const setClaimApprover = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  claimApproverId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.setClaimApprover(claimApproverId, {
    accounts: {
      tokenManager: tokenManagerId,
      issuer: wallet.publicKey,
    },
  });
};

export const setTransferAuthority = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  transferAuthorityId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.setTransferAuthority(
    transferAuthorityId,
    {
      accounts: {
        tokenManager: tokenManagerId,
        issuer: wallet.publicKey,
      },
    }
  );
};

export const addInvalidator = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  invalidatorId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.addInvalidator(invalidatorId, {
    accounts: {
      tokenManager: tokenManagerId,
      issuer: wallet.publicKey,
    },
  });
};

export const issue = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  amount: BN,
  tokenManagerTokenAccountId: PublicKey,
  issuerTokenAccountId: PublicKey,
  kind: TokenManagerKind,
  invalidationType: InvalidationType
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.issue(
    {
      amount,
      kind: kind,
      invalidationType: invalidationType,
    },
    {
      accounts: {
        tokenManager: tokenManagerId,
        tokenManagerTokenAccount: tokenManagerTokenAccountId,
        issuer: wallet.publicKey,
        issuerTokenAccount: issuerTokenAccountId,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      },
    }
  );
};

export const unissue = (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  tokenManagerTokenAccountId: PublicKey,
  issuerTokenAccountId: PublicKey
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  return tokenManagerProgram.instruction.unissue({
    accounts: {
      tokenManager: tokenManagerId,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      issuer: wallet.publicKey,
      issuerTokenAccount: issuerTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
};

export const claim = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  mintId: PublicKey,
  tokenManagerTokenAccountId: PublicKey,
  recipientTokenAccountId: PublicKey,
  claimReceipt: PublicKey | undefined
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const remainingAccounts = await getRemainingAccountsForKind(
    mintId,
    tokenManagerKind
  );

  return tokenManagerProgram.instruction.claim({
    accounts: {
      tokenManager: tokenManagerId,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      mint: mintId,
      recipient: wallet.publicKey,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    remainingAccounts: claimReceipt
      ? [
          ...remainingAccounts,
          { pubkey: claimReceipt, isSigner: false, isWritable: true },
        ]
      : remainingAccounts,
  });
};

export const createClaimReceipt = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  claimApproverId: PublicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const [claimReceiptId, claimReceiptBump] = await findClaimReceiptId(
    tokenManagerId,
    wallet.publicKey
  );

  return [
    tokenManagerProgram.instruction.createClaimReceipt(
      claimReceiptBump,
      wallet.publicKey,
      {
        accounts: {
          tokenManager: tokenManagerId,
          claimApprover: claimApproverId,
          claimReceipt: claimReceiptId,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    claimReceiptId,
  ];
};

export const creatMintManager = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const [mintManagerId, mintManagerBump] = await findMintManagerId(mintId);

  return [
    tokenManagerProgram.instruction.createMintManager(mintManagerBump, {
      accounts: {
        mintManager: mintManagerId,
        mint: mintId,
        freezeAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      },
    }),
    mintManagerId,
  ];
};

export const closMintManager = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new Provider(connection, wallet, {});
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const [mintManagerId] = await findMintManagerId(mintId);

  return [
    tokenManagerProgram.instruction.closeMintManager({
      accounts: {
        mintManager: mintManagerId,
        mint: mintId,
        freezeAuthority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
    }),
    mintManagerId,
  ];
};
