import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as TOKEN_MANAGER_TYPES from "../../idl/cardinal_token_manager";

export const TOKEN_MANAGER_ADDRESS = new PublicKey(
  "mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz"
);

export const MINT_COUNTER_SEED = "mint-counter";

export const MINT_MANAGER_SEED = "mint-manager";

export const TRANSFER_RECEIPT_SEED = "transfer-receipt";

export const CLAIM_RECEIPT_SEED = "claim-receipt";

export const TOKEN_MANAGER_SEED = "token-manager";

export const TOKEN_MANAGER_IDL = TOKEN_MANAGER_TYPES.IDL;

export type TOKEN_MANAGER_PROGRAM = TOKEN_MANAGER_TYPES.CardinalTokenManager;

export type TokenManagerTypes = AnchorTypes<
  TOKEN_MANAGER_PROGRAM,
  {
    tokenManager: TokenManagerData;
  }
>;

export type TokenManagerError = TokenManagerTypes["Error"];

type Accounts = TokenManagerTypes["Accounts"];
export type TokenManagerData = Accounts["tokenManager"];

export type MintManagerData = Accounts["mintManager"];

export type MintCounterData = Accounts["mintCounter"];

export enum TokenManagerKind {
  Managed = 1,
  Unmanaged = 2,
  Edition = 3,
}

export enum InvalidationType {
  Return = 1,
  Invalidate = 2,
  Release = 3,
}

export enum TokenManagerState {
  Initialized = 0,
  Issued = 1,
  Claimed = 2,
  Invalidated = 3,
}
