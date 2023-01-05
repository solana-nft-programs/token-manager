import type { ParsedIdlAccountData } from "@cardinal/common";
import { emptyWallet } from "@cardinal/common";
import { AnchorProvider, Program } from "@project-serum/anchor";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";

import * as TIME_INVALIDATOR_TYPES from "../../idl/cardinal_time_invalidator";

export const TIME_INVALIDATOR_ADDRESS = new PublicKey(
  "tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE"
);

export const TIME_INVALIDATOR_SEED = "time-invalidator";

export const TIME_INVALIDATOR_IDL = TIME_INVALIDATOR_TYPES.IDL;

export type TIME_INVALIDATOR_PROGRAM =
  TIME_INVALIDATOR_TYPES.CardinalTimeInvalidator;

export type TimeInvalidatorData = ParsedIdlAccountData<
  "timeInvalidator",
  TIME_INVALIDATOR_PROGRAM
>;

export type TimeInvalidationParams = {
  collector?: PublicKey;
  paymentManager?: PublicKey;
  durationSeconds?: number;
  maxExpiration?: number;
  extension?: {
    extensionPaymentAmount: number;
    extensionDurationSeconds: number;
    extensionPaymentMint: PublicKey;
    disablePartialExtension?: boolean;
  };
};

export const timeInvalidatorProgram = (
  connection: Connection,
  wallet?: Wallet,
  confirmOptions?: ConfirmOptions
) => {
  return new Program<TIME_INVALIDATOR_PROGRAM>(
    TIME_INVALIDATOR_IDL,
    TIME_INVALIDATOR_ADDRESS,
    new AnchorProvider(
      connection,
      wallet ?? emptyWallet(Keypair.generate().publicKey),
      confirmOptions ?? {}
    )
  );
};
