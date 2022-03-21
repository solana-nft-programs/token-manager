import type { AnchorTypes } from "@saberhq/anchor-contrib";
import { PublicKey } from "@solana/web3.js";

import * as STAKE_POOL_TYPES from "../../idl/cardinal_stake_pool";

export const STAKE_POOL_ADDRESS = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

export const STAKE_POOL_SEED = "stake-pool";

export const STAKE_ENTRY_SEED = "stake-entry";

export type STAKE_POOL_PROGRAM = STAKE_POOL_TYPES.CardinalStakePool;

export const STAKE_POOL_IDL = STAKE_POOL_TYPES.IDL;

export type StakePoolTypes = AnchorTypes<
  STAKE_POOL_PROGRAM,
  {
    stakePool: StakePoolData;
    stakeEntry: StakeEntryData;
  }
>;

type Accounts = StakePoolTypes["Accounts"];
export type StakePoolData = Accounts["stakePool"];
export type StakeEntryData = Accounts["stakeEntry"];
