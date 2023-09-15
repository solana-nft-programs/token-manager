import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { ParsedIdlAccountData } from "@solana-nft-programs/common";
import { emptyWallet } from "@solana-nft-programs/common";

import * as TIME_INVALIDATOR_TYPES from "../../idl/solana_nft_programs_time_invalidator";

export const TIME_INVALIDATOR_ADDRESS = new PublicKey(
  "tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE"
);

export const TIME_INVALIDATOR_SEED = "time-invalidator";

export const TIME_INVALIDATOR_IDL = TIME_INVALIDATOR_TYPES.IDL;

export type TIME_INVALIDATOR_PROGRAM =
  TIME_INVALIDATOR_TYPES.SolanaNftProgramsTimeInvalidator;

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
