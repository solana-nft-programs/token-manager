import { utils } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Transaction } from "@solana/web3.js";

import {
  claimApprover,
  paymentManager,
  timeInvalidator,
  tokenManager,
} from "./programs";

export const createRental = async (
  connection: Connection,
  wallet: Wallet,
  {
    paymentAmount,
    paymentMint,
    expiration,
  }: {
    paymentAmount: number;
    paymentMint: PublicKey;
    expiration: number;
  }
): Promise<Transaction> => {
  const transaction = new Transaction();

  // init token manager
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    utils.bytes.utf8.encode("test")
  );
  transaction.add(tokenManagerIx);

  // init payment manager
  const [paymentManagerIx, paymentManagerId] =
    await paymentManager.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      paymentMint
    );
  transaction.add(paymentManagerIx);

  // set payment manager
  transaction.add(
    tokenManager.instruction.setPaymetManager(
      connection,
      wallet,
      tokenManagerId,
      paymentManagerId
    )
  );

  // init claim approver
  transaction.add(
    await claimApprover.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      paymentManagerId,
      paymentAmount
    )
  );

  // Time invalidator
  transaction.add(
    await timeInvalidator.instruction.init(
      connection,
      wallet,
      tokenManagerId,
      expiration
    )
  );

  return transaction;
};
