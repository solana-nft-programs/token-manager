import {
  Edition,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata";
import type { Wallet } from "@saberhq/solana-contrib";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";

import { withFindOrInitAssociatedTokenAccount } from "../..";
import { InvalidationType, TokenManagerKind } from ".";
import { findMintManagerId } from "./pda";

export const getRemainingAccountsForKind = async (
  mintId: PublicKey,
  tokenManagerKind: TokenManagerKind
): Promise<AccountMeta[]> => {
  if (tokenManagerKind === TokenManagerKind.Managed) {
    const [mintManagerId] = await findMintManagerId(mintId);
    return [
      {
        pubkey: mintManagerId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (tokenManagerKind === TokenManagerKind.Edition) {
    const editionId = await Edition.getPDA(mintId);
    return [
      {
        pubkey: editionId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: MetadataProgram.PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
  } else {
    return [];
  }
};

export const getRemainingAccountsForPayment = async (
  tokenManagerId: PublicKey,
  issuerPaymentMintTokenAccountId?: PublicKey | null,
  tokenManagerPaymentMint?: PublicKey | null
): Promise<AccountMeta[]> => {
  if (tokenManagerPaymentMint && issuerPaymentMintTokenAccountId) {
    const paymentMintTokenAccountId = await Token.getAssociatedTokenAddress(
      ASSOCIATED_TOKEN_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      tokenManagerPaymentMint,
      tokenManagerId,
      true
    );

    return [
      {
        pubkey: paymentMintTokenAccountId,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: issuerPaymentMintTokenAccountId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else {
    return [];
  }
};

export const withRemainingAccountsForReturn = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  issuerId: PublicKey,
  mintId: PublicKey,
  invalidationType?: InvalidationType
): Promise<AccountMeta[]> => {
  if (invalidationType === InvalidationType.Return) {
    const issuerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      mintId,
      issuerId,
      wallet.publicKey
    );
    return [
      {
        pubkey: issuerTokenAccountId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else {
    return [];
  }
};
