import { BN, utils, web3 } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { SPLToken } from "@saberhq/token-utils";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  Token,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";

import { tokenManager, useInvalidator } from "./programs";
import { TokenManagerKind } from "./programs/tokenManager";
import { findTokenManagerAddress } from "./programs/tokenManager/pda";
import { withFindOrInitAssociatedTokenAccount } from "./utils";

export const getLink = (
  mintId: PublicKey,
  otp: Keypair,
  cluster = "mainnet",
  baseUrl = "https://app.cardinal.so/claim"
): string => {
  return `${baseUrl}/${mintId.toString()}?otp=${utils.bytes.bs58.encode(
    otp.secretKey
  )}${cluster === "devnet" ? "&cluster=devnet" : ""}`;
};

export const fromLink = (
  link: string,
  baseUrl = "https://app.cardinal.so/claim"
): [PublicKey, Keypair] => {
  try {
    const regexMatches =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      new RegExp(`${baseUrl}/(.*)\\?otp=([^&]*)`).exec(
        `${link}&cluster=devnet`
      )!;
    return [
      new web3.PublicKey(regexMatches[1] as string),
      Keypair.fromSecretKey(utils.bytes.bs58.decode(regexMatches[2] as string)),
    ];
  } catch (e) {
    console.log("Error decoding link: ", e, link);
    throw e;
  }
};

export const issueToken = async (
  connection: Connection,
  wallet: Wallet,
  {
    rentalMint,
    issuerTokenAccountId,
    usages = 1,
    amount = new BN(1),
    kind = TokenManagerKind.Managed,
  }: {
    rentalMint: PublicKey;
    issuerTokenAccountId: PublicKey;
    usages?: number;
    amount?: BN;
    kind?: TokenManagerKind;
  }
): Promise<[Transaction, PublicKey, Keypair]> => {
  const otp = Keypair.generate();
  const transaction = new Transaction();

  // init token manager
  const [tokenManagerIx, tokenManagerId] = await tokenManager.instruction.init(
    connection,
    wallet,
    rentalMint
  );
  transaction.add(tokenManagerIx);

  transaction.add(
    tokenManager.instruction.setClaimApprover(
      connection,
      wallet,
      tokenManagerId,
      otp.publicKey
    )
  );

  const [useInvalidatorIx] = await useInvalidator.instruction.init(
    connection,
    wallet,
    tokenManagerId,
    usages
  );
  transaction.add(useInvalidatorIx);

  if (kind === TokenManagerKind.Managed) {
    transaction.add(
      SPLToken.createSetAuthorityInstruction(
        TOKEN_PROGRAM_ID,
        rentalMint,
        tokenManagerId,
        "FreezeAccount",
        wallet.publicKey,
        []
      )
    );
  }

  // issuer
  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    rentalMint,
    tokenManagerId,
    wallet.publicKey,
    true
  );

  transaction.add(
    tokenManager.instruction.issue(
      connection,
      wallet,
      tokenManagerId,
      amount,
      rentalMint,
      tokenManagerTokenAccountId,
      issuerTokenAccountId,
      kind
    )
  );

  return [transaction, tokenManagerId, otp];
};

export const claimFromLink = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  otpKeypair: Keypair
): Promise<Transaction> => {
  const transaction = new Transaction();
  // const otp = utils.bytes.bs58.decode(otpString);
  // const keypair = Keypair.fromSecretKey(otp);

  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const tokenManagerData = await tokenManager.accounts.getTokenManager(
    connection,
    tokenManagerId
  );

  // approve claim request
  const [createClaimReceiptIx, claimReceiptId] =
    await tokenManager.instruction.createClaimReceipt(
      connection,
      wallet,
      tokenManagerId,
      otpKeypair.publicKey
    );
  transaction.add(createClaimReceiptIx);

  const tokenManagerTokenAccountId = await Token.getAssociatedTokenAddress(
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    tokenManagerData.parsed.mint,
    tokenManagerId,
    true
  );

  const recipientTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    tokenManagerData.parsed.mint,
    wallet.publicKey,
    wallet.publicKey
  );

  // claim
  transaction.add(
    tokenManager.instruction.claim(
      connection,
      wallet,
      tokenManagerId,
      tokenManagerData.parsed.mint,
      tokenManagerTokenAccountId,
      recipientTokenAccountId,
      claimReceiptId
    )
  );

  return transaction;
};

export const useTransaction = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  usages: number
): Promise<Transaction> => {
  const transaction = new Transaction();
  const [tokenManagerId] = await findTokenManagerAddress(mintId);

  // use
  transaction.add(
    await useInvalidator.instruction.incrementUsages(
      connection,
      wallet,
      tokenManagerId,
      usages
    )
  );

  return transaction;
};
