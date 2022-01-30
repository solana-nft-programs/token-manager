import { PublicKey } from "@solana/web3.js";

import * as TOKEN_MANAGER_TYPES from "../../idl/cardinal_token_manager";

export const TOKEN_MANAGER_ADDRESS = new PublicKey(
  "mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz"
);

export const TOKEN_MANAGER_SEED = "token-manager";

export const TOKEN_MANAGER_IDL = TOKEN_MANAGER_TYPES.IDL;

export type TOKEN_MANAGER_PROGRAM = TOKEN_MANAGER_TYPES.CardinalTokenManager;
