import type { Wallet } from "@saberhq/solana-contrib";
import * as BufferLayout from "@solana/buffer-layout";
import * as splToken from "@solana/spl-token";
import type { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { SystemProgram, TransactionInstruction } from "@solana/web3.js";

import { withFindOrInitAssociatedTokenAccount } from ".";

export async function withWrapSol(
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  lamports: number
): Promise<Transaction> {
  const nativeAssociatedTokenAccountId =
    await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      splToken.NATIVE_MINT,
      wallet.publicKey,
      wallet.publicKey
    );
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: nativeAssociatedTokenAccountId,
      lamports,
    })
  );
  transaction.add(createSyncNativeInstruction(nativeAssociatedTokenAccountId));
  return transaction;
}

export function createSyncNativeInstruction(
  nativeAccount: PublicKey
): TransactionInstruction {
  const dataLayout = BufferLayout.struct([
    BufferLayout.u8("instruction") as BufferLayout.Layout<never>,
  ]);
  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      instruction: 17, // SyncNative instruction
    },
    data
  );

  const keys = [{ pubkey: nativeAccount, isSigner: false, isWritable: true }];
  return new TransactionInstruction({
    keys,
    programId: splToken.TOKEN_PROGRAM_ID,
    data,
  });
}
