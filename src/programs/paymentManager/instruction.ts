import { AnchorProvider, BN, Program } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
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
    makerFee: BN;
    takerFee: BN;
    feeScale: BN;
    authority?: PublicKey;
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
        makerFee: new BN(params.makerFee),
        takerFee: new BN(params.takerFee),
        feeScale: new BN(params.feeScale),
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
    collectorTokenAccount: PublicKey;
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
      collectorTokenAccount: params.collectorTokenAccount,
      payer: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
  });
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
