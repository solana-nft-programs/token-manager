import {
  Edition,
  MetadataProgram,
} from "@metaplex-foundation/mpl-token-metadata";
import type { Wallet } from "@saberhq/solana-contrib";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

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

export const withRemainingAccountsForPayment = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  paymentMint: PublicKey,
  issuerId: PublicKey,
  receiptMint?: PublicKey | null
): Promise<[PublicKey, AccountMeta[]]> => {
  if (receiptMint) {
    const receiptMintLargestAccount = await connection.getTokenLargestAccounts(
      receiptMint
    );
    // get holder of receipt mint
    const receiptTokenAccountId = receiptMintLargestAccount.value[0]?.address;
    if (!receiptTokenAccountId) throw new Error("No token accounts found");
    const receiptMintToken = new Token(
      connection,
      receiptMint,
      TOKEN_PROGRAM_ID,
      Keypair.generate()
    );
    const receiptTokenAccount = await receiptMintToken.getAccountInfo(
      receiptTokenAccountId
    );

    // get ATA for this mint of receipt mint holder
    const returnTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      paymentMint,
      receiptTokenAccount.owner,
      wallet.publicKey
    );
    return [
      returnTokenAccountId,
      [
        {
          pubkey: receiptTokenAccountId,
          isSigner: false,
          isWritable: true,
        },
      ],
    ];
  } else {
    const issuerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      paymentMint,
      issuerId,
      wallet.publicKey
    );
    return [issuerTokenAccountId, []];
  }
};

export const withRemainingAccountsForReturn = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  issuerId: PublicKey,
  mintId: PublicKey,
  invalidationType?: InvalidationType,
  receiptMint?: PublicKey | null
): Promise<AccountMeta[]> => {
  if (invalidationType === InvalidationType.Return) {
    if (receiptMint) {
      const receiptMintLargestAccount =
        await connection.getTokenLargestAccounts(receiptMint);

      // get holder of receipt mint
      const receiptTokenAccountId = receiptMintLargestAccount.value[0]?.address;
      if (!receiptTokenAccountId) throw new Error("No token accounts found");
      const receiptMintToken = new Token(
        connection,
        receiptMint,
        TOKEN_PROGRAM_ID,
        Keypair.generate()
      );
      const receiptTokenAccount = await receiptMintToken.getAccountInfo(
        receiptTokenAccountId
      );

      // get ATA for this mint of receipt mint holder
      const returnTokenAccountId = await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        mintId,
        receiptTokenAccount.owner,
        wallet.publicKey
      );
      return [
        {
          pubkey: returnTokenAccountId,
          isSigner: false,
          isWritable: true,
        },
        {
          pubkey: receiptTokenAccountId,
          isSigner: false,
          isWritable: true,
        },
      ];
    } else {
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
    }
  } else {
    return [];
  }
};
