import { getBatchedMultipleAccounts } from "@cardinal/common";
import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
import { utils, Wallet } from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  AccountInfo,
  Connection,
  ParsedAccountData,
} from "@solana/web3.js";
import {
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import { withIssueToken } from "@cardinal/token-manager";
import { connectionFor } from "../common/connection";
import {
  InvalidationType,
  TokenManagerKind,
} from "@cardinal/token-manager/dist/cjs/programs/tokenManager";

// edaoJQRZZ3hfNottaxe9z5o2owJDJgL1bUChiPk15KN
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.EMPIRE_DAO_KEY || "")
);
const EMPIRE_DAO_CREATORS = ["edaoJQRZZ3hfNottaxe9z5o2owJDJgL1bUChiPk15KN"];
const PAYMENT_MINT = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
);
const SUNDAY_PASS_PAYMENT_AMOUNT = 1_000_000;
const DAY_PASS_FLOOR_3_PAYMENT_AMOUNT = 55_000_000;
const DAY_PASS_FLOOR_5_PAYMENT_AMOUNT = 60_000_000;
const BATCH_SIZE = 1;
const MAX_SIZE = 100;
const MAX_RETRIES = 3;

/**
 * Break array of type T into the given chunks for length size
 * @param arr
 * @param size
 * @returns
 */
const chunkArray = <T>(arr: T[], size: number): T[][] =>
  arr.length > size
    ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
    : [arr];

const DAY_MAPPING: { [day: string]: number } = {
  SUN: 0,
  MON: 1,
  TUES: 2,
  WEDS: 3,
  THURS: 4,
  FRI: 5,
  SAT: 6,
};

/**
 * Given a symbol string from the DAY_MAPPING compute midnight EST in UTC timestamp
 * Error if symbol is not in DAY_MAPPINGs
 * @param symbol
 * @returns
 */
export const getExpirationForSymbol = (symbol: string): number => {
  const todayNY = new Date().toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
  const today = new Date(todayNY);
  const currentDayIndex = today.getDay();

  if (!(symbol in DAY_MAPPING)) {
    throw new Error("Unknown symbol");
  }
  const targetDayIndex = DAY_MAPPING[symbol]!;

  const expirationDate = new Date();
  expirationDate.setUTCHours(
    4 + // 4 hours from EST to UTC
      24 * // next midnight
        (1 +
          (targetDayIndex >= currentDayIndex // relist midnight current day if possible
            ? targetDayIndex - currentDayIndex // offset to target
            : targetDayIndex + 6 - currentDayIndex)), // roll to next week if negative
    0,
    0,
    0
  );
  return expirationDate.getTime() / 1000;
};

/**
 * Given a symbol string from the DAY_MAPPING compute midnight EST in UTC timestamp
 * Error if symbol is not in DAY_MAPPINGs
 * @param symbol
 * @returns
 */
export const getPriceForSymbolAndName = (
  symbol: string,
  name: string
): number => {
  return symbol === "SUN"
    ? SUNDAY_PASS_PAYMENT_AMOUNT
    : name.includes("#5")
    ? DAY_PASS_FLOOR_5_PAYMENT_AMOUNT
    : DAY_PASS_FLOOR_3_PAYMENT_AMOUNT;
};

export type TokenData = {
  tokenAccount?: {
    pubkey: PublicKey;
    account: AccountInfo<ParsedAccountData>;
  };
  metaplexData?: { pubkey: PublicKey; data: metaplex.MetadataData } | null;
};

/**
 * Optimized batch lookups for tokenAccounts and metaplex data for the given accounts
 * @param connection
 * @param user
 * @returns
 */
const getTokenAccountsWithData = async (
  connection: Connection,
  user: PublicKey
): Promise<TokenData[]> => {
  const allTokenAccounts = await connection.getParsedTokenAccountsByOwner(
    user,
    { programId: TOKEN_PROGRAM_ID }
  );
  const tokenAccounts = allTokenAccounts.value
    .filter(
      (tokenAccount) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        tokenAccount.account.data.parsed.info.tokenAmount.uiAmount > 0
    )
    .sort((a, b) => a.pubkey.toBase58().localeCompare(b.pubkey.toBase58()));

  // lookup metaplex data
  const metaplexIds = await Promise.all(
    tokenAccounts.map(
      async (tokenAccount) =>
        (
          await metaplex.MetadataProgram.findMetadataAccount(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            new PublicKey(tokenAccount.account.data.parsed.info.mint)
          )
        )[0]
    )
  );
  const metaplexAccountInfos = await getBatchedMultipleAccounts(
    connection,
    metaplexIds
  );
  const metaplexData = metaplexAccountInfos.reduce((acc, accountInfo, i) => {
    try {
      acc[tokenAccounts[i]!.pubkey.toString()] = {
        pubkey: metaplexIds[i]!,
        ...accountInfo,
        data: metaplex.MetadataData.deserialize(
          accountInfo?.data as Buffer
        ) as metaplex.MetadataData,
      };
    } catch (e) {
      console.log("Failed to get metaplex data", e);
    }
    return acc;
  }, {} as { [tokenAccountId: string]: { pubkey: PublicKey; data: metaplex.MetadataData } });

  return tokenAccounts.map((tokenAccount) => ({
    tokenAccount,
    metaplexData: metaplexData[tokenAccount.pubkey.toString()],
  }));
};

export const relistNFTs = async (cluster = "devnet") => {
  console.log(`Relisting on ${cluster}`);
  const connection = connectionFor(cluster);

  // Get token accounts and metaplex data
  let tokenDatas = await getTokenAccountsWithData(connection, wallet.publicKey);

  // Filter by creators and symbol
  tokenDatas = tokenDatas
    .filter(
      ({ metaplexData }) =>
        metaplexData &&
        metaplexData.data?.data?.creators?.some(
          (creator) =>
            EMPIRE_DAO_CREATORS.includes(creator.address.toString()) &&
            creator.verified &&
            metaplexData.data?.data.symbol in DAY_MAPPING
        )
    )
    .slice(0, MAX_SIZE);

  const transactionsData: {
    transaction: Transaction;
    accountsInTx: TokenData[];
  }[] = [];
  // Batch into chunks
  const chunkedTokenDatas = chunkArray<TokenData>(tokenDatas, BATCH_SIZE);
  for (let i = 0; i < chunkedTokenDatas.length; i++) {
    const tokenDatas = chunkedTokenDatas[i]!;
    console.log(
      `\n\n\n-------- Chunk ${i + 1} of ${chunkedTokenDatas.length} --------`
    );
    const transaction = new Transaction();
    const accountsInTx: TokenData[] = [];
    for (let j = 0; j < tokenDatas.length; j++) {
      try {
        console.log(
          `>> Entry ${j + 1}/${tokenDatas.length} of chunk ${i + 1}/${
            chunkedTokenDatas.length
          }`
        );
        const tokenData = tokenDatas[j]!;
        const expiration = getExpirationForSymbol(
          tokenData.metaplexData!.data.data.symbol
        );
        await withIssueToken(transaction, connection, new Wallet(wallet), {
          mint: new PublicKey(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
            tokenData.tokenAccount!.account.data.parsed.info.mint
          ),
          kind: TokenManagerKind.Edition,
          issuerTokenAccountId: tokenData.tokenAccount!.pubkey,
          claimPayment: {
            paymentAmount: getPriceForSymbolAndName(
              tokenData.metaplexData!.data.data.symbol,
              tokenData.metaplexData!.data.data.name
            ),
            paymentMint: PAYMENT_MINT,
          },
          timeInvalidation: {
            maxExpiration: expiration,
          },
          invalidationType: InvalidationType.Return,
        });
        accountsInTx.push(tokenData);
      } catch (e) {
        console.log(e);
      }
    }

    if (transaction.instructions.length > 0) {
      transactionsData.push({ transaction, accountsInTx });
    }
  }

  await Promise.all(
    transactionsData.map(async ({ transaction, accountsInTx }) => {
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash("max")
      ).blockhash;
      transaction.sign(wallet);

      let attempts = 0;
      let txid;
      while (attempts <= MAX_RETRIES && !txid) {
        try {
          txid = await sendAndConfirmRawTransaction(
            connection,
            transaction.serialize(),
            {
              commitment: "confirmed",
            }
          );
        } catch (e) {
          console.log(e);
        }
        attempts += 1;
      }
      if (txid) {
        console.log(
          `Succesfully relist entries [${accountsInTx
            .map((e) => e.tokenAccount?.pubkey.toString())
            .join()}] with transaction ${txid} (https://explorer.solana.com/tx/${txid}?cluster=${cluster})`
        );
      } else {
        console.log(
          `Failed to relist entries [${accountsInTx
            .map((e) => e.tokenAccount?.pubkey.toString())
            .join()}] -- Skipping for now`
        );
      }
    })
  );
  return;
};

export const relistAll = async (mainnet = true) => {
  if (mainnet) {
    try {
      await relistNFTs("mainnet");
    } catch (e) {
      console.log("Failed to invalidate on mainnet: ", e);
    }
  }

  try {
    await relistNFTs("devnet");
  } catch (e) {
    console.log("Failed to invalidate on devnet: ", e);
  }
};

relistAll();
