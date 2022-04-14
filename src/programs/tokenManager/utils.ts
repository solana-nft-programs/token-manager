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
import { Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

import type { AccountData } from "../..";
import { findAta, withFindOrInitAssociatedTokenAccount } from "../..";
import type { TokenManagerData } from ".";
import {
  InvalidationType,
  PAYMENT_MANAGER_KEY,
  TokenManagerKind,
  TokenManagerState,
} from ".";
import { findMintManagerId } from "./pda";

export const getRemainingAccountsForClaim = async (
  mintId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  invalidationType: InvalidationType
): Promise<AccountMeta[]> => {
  const remainingAccountsForKind = await getRemainingAccountsForKind(
    mintId,
    tokenManagerKind
  );
  if (
    invalidationType === InvalidationType.Invalidate ||
    invalidationType === InvalidationType.Reissue
  ) {
    return [
      ...remainingAccountsForKind,
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
  }
  return getRemainingAccountsForKind(mintId, tokenManagerKind);
};

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
  receiptMint?: PublicKey | null,
  allowOwnerOffCurve = true
): Promise<[PublicKey, PublicKey, AccountMeta[]]> => {
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
    const [returnTokenAccountId, paymentManagerTokenAccountId] =
      await Promise.all([
        receiptTokenAccount.owner.equals(wallet.publicKey)
          ? await findAta(
              paymentMint,
              receiptTokenAccount.owner,
              allowOwnerOffCurve
            )
          : await withFindOrInitAssociatedTokenAccount(
              transaction,
              connection,
              paymentMint,
              receiptTokenAccount.owner,
              wallet.publicKey,
              allowOwnerOffCurve
            ),
        await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          paymentMint,
          PAYMENT_MANAGER_KEY,
          wallet.publicKey,
          true
        ),
      ]);
    return [
      returnTokenAccountId,
      paymentManagerTokenAccountId,
      [
        {
          pubkey: receiptTokenAccountId,
          isSigner: false,
          isWritable: true,
        },
      ],
    ];
  } else {
    const [issuerTokenAccountId, paymentManagerTokenAccountId] =
      await Promise.all([
        issuerId.equals(wallet.publicKey)
          ? await findAta(paymentMint, issuerId, allowOwnerOffCurve)
          : await withFindOrInitAssociatedTokenAccount(
              transaction,
              connection,
              paymentMint,
              issuerId,
              wallet.publicKey,
              allowOwnerOffCurve
            ),
        await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          paymentMint,
          PAYMENT_MANAGER_KEY,
          wallet.publicKey,
          true
        ),
      ]);
    return [issuerTokenAccountId, paymentManagerTokenAccountId, []];
  }
};

export const withRemainingAccountsForReturn = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerData: AccountData<TokenManagerData>,
  allowOwnerOffCurve = true
): Promise<AccountMeta[]> => {
  const { issuer, mint, invalidationType, receiptMint, state } =
    tokenManagerData.parsed;
  if (
    invalidationType === InvalidationType.Return ||
    state === TokenManagerState.Issued
  ) {
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
  } else if (
    invalidationType === InvalidationType.Reissue ||
    invalidationType === InvalidationType.Invalidate
  ) {
    return [
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ];
  } else {
    return [];
  }
};
