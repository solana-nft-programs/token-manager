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

import type { AccountData } from "../..";
import { findAta, withFindOrInitAssociatedTokenAccount } from "../..";
import type { TokenManagerData } from ".";
import { InvalidationType, TokenManagerKind, TokenManagerState } from ".";
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
  paymentManager: PublicKey,
  receiptMint?: PublicKey | null,
  payer = wallet.publicKey
): Promise<[PublicKey, PublicKey, AccountMeta[]]> => {
  console.log("heyyy", paymentManager.toString());
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
    const [returnTokenAccountId, feeCollectorTokenAccountId] =
      await Promise.all([
        receiptTokenAccount.owner.equals(wallet.publicKey)
          ? await findAta(paymentMint, receiptTokenAccount.owner, true)
          : await withFindOrInitAssociatedTokenAccount(
              transaction,
              connection,
              paymentMint,
              receiptTokenAccount.owner,
              payer,
              true
            ),
        await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          paymentMint,
          paymentManager,
          payer,
          true
        ),
      ]);
    return [
      returnTokenAccountId,
      feeCollectorTokenAccountId,
      [
        {
          pubkey: receiptTokenAccountId,
          isSigner: false,
          isWritable: true,
        },
      ],
    ];
  } else {
    const [issuerTokenAccountId, feeCollectorTokenAccountId] =
      await Promise.all([
        issuerId.equals(wallet.publicKey)
          ? await findAta(paymentMint, issuerId, true)
          : await withFindOrInitAssociatedTokenAccount(
              transaction,
              connection,
              paymentMint,
              issuerId,
              payer,
              true
            ),
        await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          paymentMint,
          paymentManager,
          payer,
          true
        ),
      ]);
    return [issuerTokenAccountId, feeCollectorTokenAccountId, []];
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
  } else {
    return [];
  }
};
