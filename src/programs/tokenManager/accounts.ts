import {
  AnchorProvider,
  BN,
  BorshAccountsCoder,
  Program,
  utils,
} from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";

import type { AccountData } from "../../utils";
import type { TokenManagerState } from ".";
import type {
  MintCounterData,
  MintManagerData,
  TOKEN_MANAGER_PROGRAM,
  TokenManagerData,
  TransferReceiptData,
} from "./constants";
import { TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_IDL } from "./constants";

export const getTokenManager = async (
  connection: Connection,
  tokenManagerId: PublicKey
): Promise<AccountData<TokenManagerData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.tokenManager.fetch(
    tokenManagerId
  );
  return {
    parsed,
    pubkey: tokenManagerId,
  };
};

export const getTokenManagers = async (
  connection: Connection,
  tokenManagerIds: PublicKey[]
): Promise<AccountData<TokenManagerData>[]> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  let tokenManagers = [];
  try {
    tokenManagers =
      await tokenManagerProgram.account.tokenManager.fetchMultiple(
        tokenManagerIds
      );
  } catch (e) {
    console.log(e);
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return tokenManagers.map((tm, i) => ({
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    parsed: tm,
    pubkey: tokenManagerIds[i],
  }));
};

export const getTokenManagersByState = async (
  connection: Connection,
  state: TokenManagerState | null
): Promise<AccountData<TokenManagerData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("tokenManager")
            ),
          },
        },
        ...(state
          ? [
              {
                memcmp: {
                  offset: 92,
                  bytes: utils.bytes.bs58.encode(
                    new BN(state).toArrayLike(Buffer, "le", 1)
                  ),
                },
              },
            ]
          : []),
      ],
    }
  );
  const tokenManagerDatas: AccountData<TokenManagerData>[] = [];
  const coder = new BorshAccountsCoder(TOKEN_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      const tokenManagerData: TokenManagerData = coder.decode(
        "tokenManager",
        account.account.data
      );
      if (tokenManagerData) {
        tokenManagerDatas.push({
          ...account,
          parsed: tokenManagerData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode token manager data`);
    }
  });

  return tokenManagerDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};

export const getMintManager = async (
  connection: Connection,
  mintManagerId: PublicKey
): Promise<AccountData<MintManagerData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.mintManager.fetch(
    mintManagerId
  );
  return {
    parsed,
    pubkey: mintManagerId,
  };
};

export const getMintCounter = async (
  connection: Connection,
  mintCounterId: PublicKey
): Promise<AccountData<MintCounterData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.mintCounter.fetch(
    mintCounterId
  );
  return {
    parsed,
    pubkey: mintCounterId,
  };
};

export const getTokenManagersForIssuer = async (
  connection: Connection,
  issuerId: PublicKey
): Promise<AccountData<TokenManagerData>[]> => {
  const programAccounts = await connection.getProgramAccounts(
    TOKEN_MANAGER_ADDRESS,
    {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: utils.bytes.bs58.encode(
              BorshAccountsCoder.accountDiscriminator("tokenManager")
            ),
          },
        },
        { memcmp: { offset: 19, bytes: issuerId.toBase58() } },
      ],
    }
  );

  const tokenManagerDatas: AccountData<TokenManagerData>[] = [];
  const coder = new BorshAccountsCoder(TOKEN_MANAGER_IDL);
  programAccounts.forEach((account) => {
    try {
      const tokenManagerData: TokenManagerData = coder.decode(
        "tokenManager",
        account.account.data
      );
      if (tokenManagerData) {
        tokenManagerDatas.push({
          ...account,
          parsed: tokenManagerData,
        });
      }
    } catch (e) {
      console.log(`Failed to decode token manager data`);
    }
  });

  return tokenManagerDatas.sort((a, b) =>
    a.pubkey.toBase58().localeCompare(b.pubkey.toBase58())
  );
};

export const getTransferReceipt = async (
  connection: Connection,
  transferReceiptId: PublicKey
): Promise<AccountData<TransferReceiptData>> => {
  const provider = new AnchorProvider(
    connection,
    new SignerWallet(Keypair.generate()),
    {}
  );
  const tokenManagerProgram = new Program<TOKEN_MANAGER_PROGRAM>(
    TOKEN_MANAGER_IDL,
    TOKEN_MANAGER_ADDRESS,
    provider
  );

  const parsed = await tokenManagerProgram.account.transferReceipt.fetch(
    transferReceiptId
  );
  return {
    parsed,
    pubkey: transferReceiptId,
  };
};
