import type NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import type { Wallet } from "@saberhq/solana-contrib";
import type * as web3 from "@solana/web3.js";

import { initStakePool } from "./instruction";
import { findStakePoolId } from "./pda";

export const withCreatePool = async (
  transaction: web3.Transaction,
  connection: web3.Connection,
  wallet: Wallet,
  params: {
    identifier: web3.PublicKey;
  }
): Promise<[web3.Transaction, web3.PublicKey]> => {
  const [stakePoolId] = await findStakePoolId(params.identifier);
  transaction.add(
    initStakePool(connection, wallet as NodeWallet, {
      identifier: params.identifier,
      stakePoolId: stakePoolId,
    })
  );
  return [transaction, stakePoolId];
};
