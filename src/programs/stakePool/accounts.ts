import { Program, Provider } from "@project-serum/anchor";
import type * as web3 from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { STAKE_POOL_PROGRAM, StakePoolData } from ".";
import { STAKE_POOL_ADDRESS, STAKE_POOL_IDL } from ".";

export const getStakePool = async (
  connection: web3.Connection,
  stakePoolId: web3.PublicKey
): Promise<AccountData<StakePoolData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );

  const parsed = await stakePoolProgram.account.stakePool.fetch(stakePoolId);
  return {
    parsed,
    pubkey: stakePoolId,
  };
};

export const getStakeEntry = async (
  connection: web3.Connection,
  stakePoolId: web3.PublicKey
): Promise<AccountData<StakePoolData>> => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const provider = new Provider(connection, null, {});
  const stakePoolProgram = new Program<STAKE_POOL_PROGRAM>(
    STAKE_POOL_IDL,
    STAKE_POOL_ADDRESS,
    provider
  );

  const parsed = await stakePoolProgram.account.stakePool.fetch(stakePoolId);
  return {
    parsed,
    pubkey: stakePoolId,
  };
};
