import { BN, Program, Provider } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type {
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import type { RENTAL_COUNTER_PROGRAM } from "./constants";
import { RENTAL_COUNTER_ADDRESS, RENTAL_COUNTER_IDL } from "./constants";
import { findRentalCounterAddress } from "./pda";

export const increment = async (
  connection: Connection,
  wallet: Wallet
): Promise<[TransactionInstruction, PublicKey, BN]> => {
  const provider = new Provider(connection, wallet, {});
  const rentalCounterProgram = new Program<RENTAL_COUNTER_PROGRAM>(
    RENTAL_COUNTER_IDL,
    RENTAL_COUNTER_ADDRESS,
    provider
  );

  const [rentalCounterId, renalCounterBump] = await findRentalCounterAddress(
    wallet.publicKey
  );
  const currentCounter =
    await rentalCounterProgram.account.rentalCounter.fetchNullable(
      rentalCounterId
    );

  return [
    rentalCounterProgram.instruction.increment(renalCounterBump, {
      accounts: {
        rentalCounter: rentalCounterId,
        user: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }),
    rentalCounterId,
    currentCounter?.count ?? new BN(0),
  ];
};
