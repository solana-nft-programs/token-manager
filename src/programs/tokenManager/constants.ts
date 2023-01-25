import type { ParsedIdlAccountData } from "@cardinal/common";
import { emptyWallet } from "@cardinal/common";
import { AnchorProvider, Program } from "@project-serum/anchor";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";

import * as TOKEN_MANAGER_TYPES from "../../idl/cardinal_token_manager";

export const TOKEN_MANAGER_ADDRESS = new PublicKey(
  "mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM"
);

export const MINT_COUNTER_SEED = "mint-counter";

export const MINT_MANAGER_SEED = "mint-manager";

export const TRANSFER_RECEIPT_SEED = "transfer-receipt";

export const CLAIM_RECEIPT_SEED = "claim-receipt";

export const TOKEN_MANAGER_SEED = "token-manager";

export const RECEIPT_MINT_MANAGER_SEED = "receipt-mint-manager";

export const TOKEN_MANAGER_IDL = TOKEN_MANAGER_TYPES.IDL;

export type TOKEN_MANAGER_PROGRAM = TOKEN_MANAGER_TYPES.CardinalTokenManager;

export type TokenManagerData = ParsedIdlAccountData<
  "tokenManager",
  TOKEN_MANAGER_PROGRAM
>;

export type MintManagerData = ParsedIdlAccountData<
  "mintManager",
  TOKEN_MANAGER_PROGRAM
>;

export type MintCounterData = ParsedIdlAccountData<
  "mintCounter",
  TOKEN_MANAGER_PROGRAM
>;

export type TransferReceiptData = ParsedIdlAccountData<
  "transferReceipt",
  TOKEN_MANAGER_PROGRAM
>;

export enum TokenManagerKind {
  Managed = 1,
  Unmanaged = 2,
  Edition = 3,
  Permissioned = 4,
  Programmable = 5,
}

export enum InvalidationType {
  Return = 1,
  Invalidate = 2,
  Release = 3,
  Reissue = 4,
  Vest = 5,
}

export enum TokenManagerState {
  Initialized = 0,
  Issued = 1,
  Claimed = 2,
  Invalidated = 3,
}

export const CRANK_KEY = new PublicKey(
  "crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr"
);

export const tokenManagerProgram = (
  connection: Connection,
  wallet?: Wallet,
  confirmOptions?: ConfirmOptions
) => {
  return new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    new AnchorProvider(
      connection,
      wallet ?? emptyWallet(Keypair.generate().publicKey),
      confirmOptions ?? {}
    )
  );
};
