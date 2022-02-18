import { Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";

import { findAta } from "../..";
import type { TokenManagerKind } from "../tokenManager";
import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import {
  getRemainingAccountsForKind,
  getRemainingAccountsForPayment,
} from "../tokenManager/utils";
import type { RECEIPT_INDEX_PROGRAM } from "./constants";
import { RECEIPT_INDEX_ADDRESS, RECEIPT_INDEX_IDL } from "./constants";
import { findReceiptMarkerAddress } from "./pda";

export const invalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  tokenManagerId: PublicKey,
  tokenManagerKind: TokenManagerKind,
  recipientTokenAccountId: PublicKey,
  issuerPaymentMintTokenAccountId?: PublicKey | null,
  tokenManagerPaymentMint?: PublicKey | null
): Promise<TransactionInstruction> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RECEIPT_INDEX_PROGRAM>(
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

  const [paymentAccounts, transferAccounts] = await Promise.all([
    getRemainingAccountsForPayment(
      tokenManagerId,
      issuerPaymentMintTokenAccountId,
      tokenManagerPaymentMint
    ),
    getRemainingAccountsForKind(mintId, tokenManagerKind),
  ]);

  return rentalCounterProgram.instruction.invalidate({
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
    remainingAccounts: [...paymentAccounts, ...transferAccounts],
  });
};
