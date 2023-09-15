import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";
import type { ParsedIdlAccountData } from "@solana-nft-programs/common";
import { emptyWallet } from "@solana-nft-programs/common";

import * as USE_INVALIDATOR_TYPES from "../../idl/solana_nft_programs_use_invalidator";

export const USE_INVALIDATOR_ADDRESS = new PublicKey(
  "useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp"
);

export const USE_INVALIDATOR_SEED = "use-invalidator";

export const USE_INVALIDATOR_IDL = USE_INVALIDATOR_TYPES.IDL;

export type USE_INVALIDATOR_PROGRAM =
  USE_INVALIDATOR_TYPES.SolanaNftProgramsUseInvalidator;

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
      wallet ?? emptyWallet(Keypair.generate().publicKey),
      confirmOptions ?? {}
    )
  );
};
