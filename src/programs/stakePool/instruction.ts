import { MetadataProgram } from "@metaplex-foundation/mpl-token-metadata";
import type { Wallet } from "@project-serum/anchor";
import { Program, Provider } from "@project-serum/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { TransactionInstruction } from "@solana/web3.js";
import * as web3 from "@solana/web3.js";

import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import { findTokenManagerAddress } from "../tokenManager/pda";
import type { STAKE_POOL_PROGRAM } from ".";
import { STAKE_POOL_ADDRESS, STAKE_POOL_IDL } from ".";
import { findStakeEntryId, findStakePoolId } from "./pda";

export const initStakePool = (
  connection: web3.Connection,
  wallet: Wallet,
  params: { identifier: web3.PublicKey; stakePoolId: web3.PublicKey }
): TransactionInstruction => {
  const provider = new Provider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );
  return stakePoolProgram.instruction.initPool(
    {
      identifier: params.identifier,
    },
    {
      accounts: {
        stakePool: params.stakePoolId,
        payer: wallet.publicKey,
        systemProgram: web3.SystemProgram.programId,
      },
    }
  );
};

export const initStakeEntry = async (
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    stakePoolIdentifier: web3.PublicKey;
    tokenManager: web3.PublicKey;
    originalMint: web3.PublicKey;
    mintTokenAccount: web3.PublicKey;
    mintMetadata: web3.PublicKey;
    mint: web3.PublicKey;
    name: string;
    symbol: string;
    textOverlay: string;
  }
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );

  const [stakePoolId, stakeEntryId] = await Promise.all([
    findStakePoolId(params.stakePoolIdentifier),
    findStakeEntryId(params.stakePoolIdentifier, params.originalMint),
  ]);

  return stakePoolProgram.instruction.initEntry(
    {
      name: params.name,
      symbol: params.symbol,
      textOverlay: params.textOverlay,
    },
    {
      accounts: {
        stakeEntry: stakeEntryId,
        stakePool: stakePoolId,
        tokenManager: params.tokenManager,
        originalMint: params.originalMint,
        mint: params.mint,
        mintTokenAccount: params.mintTokenAccount,
        mintMetadata: params.mintMetadata,
        payer: wallet.publicKey,
        rent: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MetadataProgram.PUBKEY,
        systemProgram: web3.SystemProgram.programId,
      },
    }
  );
};

export const stake = async (
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    identifier: web3.PublicKey;
    stakePoolIdentifier: web3.PublicKey;
    originalMint: web3.PublicKey;
    mint: web3.PublicKey;
    stakeEntryOriginalMintTokenAccount: web3.PublicKey;
    stakeEntryTokenManagerMintTokenAccount: web3.PublicKey;
    user: web3.PublicKey;
    userOriginalMintTokenAccount: web3.PublicKey;
    userTokenManagerMintTokenAccount: web3.PublicKey;
    tokenManagerTokenAccount: web3.PublicKey;
  }
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );

  const [stakeEntryId, tokenManagerId] = await Promise.all([
    findStakeEntryId(params.stakePoolIdentifier, params.originalMint),
    findTokenManagerAddress(params.originalMint),
  ]);

  return stakePoolProgram.instruction.stake({
    accounts: {
      stakeEntry: stakeEntryId,
      tokenManager: tokenManagerId,
      originalMint: params.originalMint,
      mint: params.mint,
      stakeEntryOriginalMintTokenAccount:
        params.stakeEntryOriginalMintTokenAccount,
      stakeEntryTokenManagerMintTokenAccount:
        params.stakeEntryTokenManagerMintTokenAccount,
      user: params.user,
      userOriginalMintTokenAccount: params.userOriginalMintTokenAccount,
      userTokenManagerMintTokenAccount: params.userTokenManagerMintTokenAccount,
      tokenManagerTokenAccount: params.tokenManagerTokenAccount,
      tokenProgram: TOKEN_PROGRAM_ID,
      tokenManagerProgram: TOKEN_MANAGER_ADDRESS,
      associatedToken: ASSOCIATED_TOKEN_PROGRAM_ID,
      rent: web3.SYSVAR_RENT_PUBKEY,
      systemProgram: web3.SystemProgram.programId,
    },
  });
};
