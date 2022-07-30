import type { BN } from "@project-serum/anchor";
import { AnchorProvider, Program } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import { CRANK_KEY } from "../tokenManager";
import type { PAYMENT_MANAGER_PROGRAM } from ".";
import { PAYMENT_MANAGER_ADDRESS, PAYMENT_MANAGER_IDL } from ".";
import { findPaymentManagerAddress } from "./pda";

export const init = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  params: {
    feeCollector: PublicKey;
    authority?: PublicKey;
    makerFeeBasisPoints: number;
    takerFeeBasisPoints: number;
  }
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const [paymentManagerId] = await findPaymentManagerAddress(name);

  return [
    paymentManagerProgram.instruction.init(
      {
        name: name,
        feeCollector: params.feeCollector,
        makerFeeBasisPoints: params.makerFeeBasisPoints,
        takerFeeBasisPoints: params.takerFeeBasisPoints,
      },
      {
        accounts: {
          paymentManager: paymentManagerId,
          authority: params.authority || wallet.publicKey,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    paymentManagerId,
  ];
};

export const managePayment = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  params: {
    paymentAmount: BN;
    payerTokenAccount: PublicKey;
    feeCollectorTokenAccount: PublicKey;
    paymentTokenAccount: PublicKey;
  }
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const [paymentManagerId] = await findPaymentManagerAddress(name);
  return paymentManagerProgram.instruction.managePayment(params.paymentAmount, {
    accounts: {
      paymentManager: paymentManagerId,
      payerTokenAccount: params.payerTokenAccount,
      feeCollectorTokenAccount: params.feeCollectorTokenAccount,
      paymentTokenAccount: params.paymentTokenAccount,
      payer: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
};

export const handlePaymentWithRoyalties = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  params: {
    paymentAmount: BN;
    payerTokenAccount: PublicKey;
    feeCollectorTokenAccount: PublicKey;
    paymentTokenAccount: PublicKey;
    paymentMint: PublicKey;
    mint: PublicKey;
    mintMetadata: PublicKey;
    royaltiesRemainingAccounts: AccountMeta[];
  }
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const [paymentManagerId] = await findPaymentManagerAddress(name);
  return paymentManagerProgram.instruction.handlePaymentWithRoyalties(
    params.paymentAmount,
    {
      accounts: {
        paymentManager: paymentManagerId,
        payerTokenAccount: params.payerTokenAccount,
        feeCollectorTokenAccount: params.feeCollectorTokenAccount,
        paymentTokenAccount: params.paymentTokenAccount,
        paymentMint: params.paymentMint,
        mint: params.mint,
        mintMetadata: params.mintMetadata,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      remainingAccounts: [...params.royaltiesRemainingAccounts],
    }
  );
};

export const close = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  collector?: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const paymentManagerProgram = new Program<PAYMENT_MANAGER_PROGRAM>(
    PAYMENT_MANAGER_IDL,
    PAYMENT_MANAGER_ADDRESS,
    provider
  );

  const [paymentManagerId] = await findPaymentManagerAddress(name);
  return paymentManagerProgram.instruction.close({
    accounts: {
      paymentManager: paymentManagerId,
      collector: collector || CRANK_KEY,
      closer: wallet.publicKey,
    },
  });
};
