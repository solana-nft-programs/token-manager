import {
  MasterEdition,
  Metadata,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata";
import { Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

import { findAta } from "../..";
import {
  InvalidationType,
  TOKEN_MANAGER_ADDRESS,
  TokenManagerKind,
} from "../tokenManager";
import { findTokenManagerAddress } from "../tokenManager/pda";
import { getRemainingAccountsForKind } from "../tokenManager/utils";
import type { RECEIPT_INDEX_PROGRAM } from "./constants";
import { RECEIPT_INDEX_ADDRESS, RECEIPT_INDEX_IDL } from "./constants";
import { findReceiptMarkerAddress } from "./pda";

export const claim = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  tokenManagerId: PublicKey,
  recipientTokenAccountId: PublicKey,
  receiptMintId: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const receiptIndexProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [
    [receiptMarkerId],
    [receiptTokenManagerId],
    receiptMintMetadataId,
    receiptMintMasterEditionId,
  ] = await Promise.all([
    findReceiptMarkerAddress(tokenManagerId),
    findTokenManagerAddress(receiptMintId),
    Metadata.getPDA(receiptMintId),
    MasterEdition.getPDA(receiptMintId),
  ]);

  const [receiptMarkerTokenAccountId, receiptTokenManagerTokenAccountId] =
    await Promise.all([
      findAta(receiptMintId, receiptMarkerId, true),
      findAta(receiptMintId, receiptTokenManagerId, true),
    ]);

  return receiptIndexProgram.instruction.claim(
    name,
    TokenManagerKind.Edition,
    InvalidationType.Return,
    {
      accounts: {
        tokenManager: tokenManagerId,
        receiptMarker: receiptMarkerId,
        receiptMarkerTokenAccount: receiptMarkerTokenAccountId,
        receiptTokenManager: receiptTokenManagerId,
        receiptTokenManagerTokenAccount: receiptTokenManagerTokenAccountId,
        receiptMint: receiptMintId,
        receiptMintMetadata: receiptMintMetadataId,
        receiptMintMasterEdition: receiptMintMasterEditionId,
        recipientTokenAccount: recipientTokenAccountId,
        issuer: wallet.publicKey,
        payer: wallet.publicKey,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedToken: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenMetadataProgram: MetadataProgram.PUBKEY,
        rent: SYSVAR_RENT_PUBKEY,
      },
    }
  );
};

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  tokenManagerId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  recipientTokenAccountId: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const receiptIndexProgram = new Program<RECEIPT_INDEX_PROGRAM>(
    RECEIPT_INDEX_IDL,
    RECEIPT_INDEX_ADDRESS,
    provider
  );

  const [receiptMarkerId] = await findReceiptMarkerAddress(tokenManagerId);

  const tokenManagerTokenAccountId = await findAta(
    mintId,
    tokenManagerId,
    true
  );

  const receiptMarkerTokenAccountId = await findAta(
    mintId,
    receiptMarkerId,
    true
  );

  const transferAccounts = await getRemainingAccountsForKind(
    mintId,
    tokenManagerKind
  );

  return receiptIndexProgram.instruction.invalidate({
    accounts: {
      tokenManager: tokenManagerId,
      receiptMarker: receiptMarkerId,
      invalidator: wallet.publicKey,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      receiptTokenManagerTokenAccount: tokenManagerTokenAccountId,
      receiptMarkerTokenAccount: receiptMarkerTokenAccountId,
      receiptMint: mintId,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    remainingAccounts: [...transferAccounts],
  });
};
