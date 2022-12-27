import type { ParsedIdlAccountData } from "@cardinal/common";
import {
  AnchorProvider,
  Program,
  Wallet as AWallet,
} from "@project-serum/anchor";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";

import * as USE_INVALIDATOR_TYPES from "../../idl/cardinal_use_invalidator";

export const USE_INVALIDATOR_ADDRESS = new PublicKey(
  "useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp"
);

export const USE_INVALIDATOR_SEED = "use-invalidator";

export const USE_INVALIDATOR_IDL = USE_INVALIDATOR_TYPES.IDL;

export type USE_INVALIDATOR_PROGRAM =
  USE_INVALIDATOR_TYPES.CardinalUseInvalidator;

export type UseInvalidatorData = ParsedIdlAccountData<
  "useInvalidator",
  USE_INVALIDATOR_PROGRAM
>;

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

export const useInvalidatorProgram = (
  connection: Connection,
  wallet?: Wallet,
  confirmOptions?: ConfirmOptions
) => {
  return new Program<USE_INVALIDATOR_PROGRAM>(
    USE_INVALIDATOR_IDL,
    USE_INVALIDATOR_ADDRESS,
    new AnchorProvider(
      connection,
      wallet ?? new AWallet(Keypair.generate()),
      confirmOptions ?? {}
    )
  );
};
