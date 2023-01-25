import type { AccountData } from "@cardinal/common";
import {
  findMintEditionId,
  findMintMetadataId,
  METADATA_PROGRAM_ID,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import { PROGRAM_ID as TOKEN_AUTH_RULES_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token";
import type { AccountMeta, Connection, Transaction } from "@solana/web3.js";
import { PublicKey, SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";

import type { TokenManagerData } from ".";
import {
  CRANK_KEY,
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from ".";
import { findMintManagerId, findTransferReceiptId } from "./pda";

export const getRemainingAccountsForKind = (
  mintId: PublicKey,
  tokenManagerKind: TokenManagerKind
): AccountMeta[] => {
  if (
    tokenManagerKind === TokenManagerKind.Managed ||
    tokenManagerKind === TokenManagerKind.Permissioned
  ) {
    const mintManagerId = findMintManagerId(mintId);
    return [
      {
        pubkey: mintManagerId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (tokenManagerKind === TokenManagerKind.Edition) {
    const editionId = findMintEditionId(mintId);
    return [
      {
        pubkey: editionId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: METADATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
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
  tokenManagerData: AccountData<TokenManagerData>,
  allowOwnerOffCurve = true
): Promise<AccountMeta[]> => {
  const { issuer, mint, claimApprover, invalidationType, receiptMint, state } =
    tokenManagerData.parsed;
  if (
    invalidationType === InvalidationType.Vest &&
    state === TokenManagerState.Issued
  ) {
    if (!claimApprover) throw "Claim approver must be set";
    const claimApproverTokenAccountId =
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        mint,
        claimApprover,
        wallet.publicKey,
        allowOwnerOffCurve
      );
    return [
      {
        pubkey: claimApproverTokenAccountId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (
    invalidationType === InvalidationType.Return ||
    state === TokenManagerState.Issued
  ) {
    if (receiptMint) {
      const receiptMintLargestAccount =
        await connection.getTokenLargestAccounts(receiptMint);

      // get holder of receipt mint
      const receiptTokenAccountId = receiptMintLargestAccount.value[0]?.address;
      if (!receiptTokenAccountId) throw new Error("No token accounts found");
      const receiptTokenAccount = await getAccount(
        connection,
        receiptTokenAccountId
      );

      // get ATA for this mint of receipt mint holder
      const returnTokenAccountId = await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        mint,
        receiptTokenAccount.owner,
        wallet.publicKey,
        allowOwnerOffCurve
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
        mint,
        issuer,
        wallet.publicKey,
        allowOwnerOffCurve
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

export const getRemainingAccountsForTransfer = (
  transferAuthority: PublicKey | null,
  tokenManagerId: PublicKey
): AccountMeta[] => {
  if (transferAuthority) {
    const transferReceiptId = findTransferReceiptId(tokenManagerId);
    return [
      {
        pubkey: transferReceiptId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else {
    return [];
  }
};

export const getRemainingAccountsForIssue = (
  tokenManagerKind: TokenManagerKind,
  mintId: PublicKey,
  issuerTokenAccountId: PublicKey,
  tokenManagerTokenAccountId: PublicKey
): AccountMeta[] => {
  if (tokenManagerKind === TokenManagerKind.Permissioned) {
    return [
      {
        pubkey: CRANK_KEY,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (tokenManagerKind === TokenManagerKind.Programmable) {
    return [
      {
        pubkey: mintId,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: findMintMetadataId(mintId),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: findMintEditionId(mintId),
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: findTokenRecordPda(mintId, issuerTokenAccountId),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: findTokenRecordPda(mintId, tokenManagerTokenAccountId),
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: TOKEN_AUTH_RULES_ID,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: PublicKey.default, // TODO
        isSigner: false,
        isWritable: false,
      },
    ];
  } else {
    return [];
  }
};

export function findTokenRecordPda(
  mint: PublicKey,
  token: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("token_record"),
      token.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
}
