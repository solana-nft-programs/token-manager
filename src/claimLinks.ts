import { BN, utils, web3 } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";

import { withClaimToken, withIssueToken } from ".";
import { InvalidationType, TokenManagerKind } from "./programs/tokenManager";

export const getLink = (
  tokenManagerId: PublicKey,
  otp: Keypair | undefined,
  cluster = "devnet",
  baseUrl = "https://main.cardinal.so/claim"
): string => {
  return `${baseUrl}/${tokenManagerId.toString()}${
    otp ? `?otp=${utils.bytes.bs58.encode(otp.secretKey)}` : "?"
  }${cluster === "devnet" ? "&cluster=devnet" : ""}`;
};

export const fromLink = (link: string): [PublicKey, Keypair] => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const idRegex = new RegExp(`/claim/([^?]*)`).exec(link)!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const otpRegex = /otp=([^&]*)/.exec(link)!;
    return [
      new web3.PublicKey(idRegex[1] as string),
      Keypair.fromSecretKey(utils.bytes.bs58.decode(otpRegex[1] as string)),
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
    mint,
    issuerTokenAccountId,
    usages = 1,
    amount = new BN(1),
    kind = TokenManagerKind.Managed,
    invalidationType = InvalidationType.Return,
  }: {
    mint: PublicKey;
    issuerTokenAccountId: PublicKey;
    usages?: number;
    amount?: BN;
    kind?: TokenManagerKind;
    invalidationType?: InvalidationType;
  }
): Promise<[Transaction, PublicKey, Keypair]> => {
  const [transaction, tokenManagerId, otp] = await withIssueToken(
    new Transaction(),
    connection,
    wallet,
    {
      mint,
      issuerTokenAccountId,
      usages,
      amount,
      kind,
      invalidationType,
      visibility: "private",
    }
  );
  return [transaction, tokenManagerId, otp!];
};

export const claimFromLink = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  otpKeypair: Keypair
): Promise<Transaction> =>
  withClaimToken(
    new Transaction(),
    connection,
    wallet,
    tokenManagerId,
    otpKeypair
  );
