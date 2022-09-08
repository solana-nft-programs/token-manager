import { BN, utils, web3 } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import type { Connection, PublicKey } from "@solana/web3.js";
import { Keypair, Transaction } from "@solana/web3.js";

import { withClaimToken, withIssueToken } from ".";
import { InvalidationType, TokenManagerKind } from "./programs/tokenManager";
import type { UseInvalidationParams } from "./programs/useInvalidator/instruction";

export const getLink = (
  tokenManagerId: PublicKey,
  otp: Keypair | undefined,
  cluster = "devnet",
  baseUrl = "https://rent.cardinal.so",
  collection = "claim"
): string => {
  const url = new URL(`${baseUrl}/${collection}/${tokenManagerId.toString()}`);
  if (otp) {
    url.searchParams.append("otp", utils.bytes.bs58.encode(otp.secretKey));
  }
  if (cluster === "devnet") {
    url.searchParams.append("cluster", "devnet");
  }
  return url.toString();
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
    useInvalidation = { totalUsages: 1 },
    amount = new BN(1),
    kind = TokenManagerKind.Managed,
    invalidationType = InvalidationType.Return,
  }: {
    mint: PublicKey;
    issuerTokenAccountId: PublicKey;
    useInvalidation?: UseInvalidationParams;
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
      useInvalidation,
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
  tokenManagerId: PublicKey
): Promise<Transaction> =>
  withClaimToken(new Transaction(), connection, wallet, tokenManagerId);
