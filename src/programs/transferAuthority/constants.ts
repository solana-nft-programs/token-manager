import type { ParsedIdlAccountData } from "@cardinal/common";
import { emptyWallet } from "@cardinal/common";
import { AnchorProvider, Program } from "@project-serum/anchor";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import type { ConfirmOptions, Connection } from "@solana/web3.js";
import { Keypair, PublicKey } from "@solana/web3.js";

import * as TRANSFER_AUTHORITY_TYPES from "../../idl/cardinal_transfer_authority";

export const TRANSFER_AUTHORITY_ADDRESS = new PublicKey(
  "trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW"
);

export const TRANSFER_AUTHORITY_SEED = "transfer-authority";
export const MARKETPLACE_SEED = "marketplace";
export const LISTING_SEED = "listing";
export const TRANSFER_SEED = "transfer";

export const TRANSFER_AUTHORITY_IDL = TRANSFER_AUTHORITY_TYPES.IDL;

export type TRANSFER_AUTHORITY_PROGRAM =
  TRANSFER_AUTHORITY_TYPES.CardinalTransferAuthority;

export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const DEFAULT_TRANSFER_AUTHORITY_NAME = "global";

export type TransferAuthorityData = ParsedIdlAccountData<
  "transferAuthority",
  TRANSFER_AUTHORITY_PROGRAM
>;
export type MarketplaceData = ParsedIdlAccountData<
  "marketplace",
  TRANSFER_AUTHORITY_PROGRAM
>;
export type ListingData = ParsedIdlAccountData<
  "listing",
  TRANSFER_AUTHORITY_PROGRAM
>;
export type TransferData = ParsedIdlAccountData<
  "transfer",
  TRANSFER_AUTHORITY_PROGRAM
>;

export const transferAuthorityProgram = (
  connection: Connection,
  wallet?: Wallet,
  confirmOptions?: ConfirmOptions
) => {
  return new Program<TRANSFER_AUTHORITY_PROGRAM>(
    TRANSFER_AUTHORITY_IDL,
    TRANSFER_AUTHORITY_ADDRESS,
    new AnchorProvider(
      connection,
      wallet ?? emptyWallet(Keypair.generate().publicKey),
      confirmOptions ?? {}
    )
  );
};
