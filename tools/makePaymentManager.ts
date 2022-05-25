import { BN } from "@project-serum/anchor";
import * as anchor from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import { PublicKey } from "@solana/web3.js";
import * as web3Js from "@solana/web3.js";

import { paymentManager } from "../src/programs";
import { connectionFor } from "./utils";

const wallet = web3Js.Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode("ENTER_SECRET_KEY")
); // your wallet's secret key

export type PaymentManagerParams = {
  makerFee: BN;
  takerFee: BN;
  feeScale: BN;
  authority?: PublicKey;
};

const main = async (
  paymentManagerName: string,
  params: PaymentManagerParams,
  cluster = "devnet"
) => {
  const connection = connectionFor(cluster);
  await paymentManager.instruction.init(
    connection,
    new SignerWallet(wallet),
    paymentManagerName,
    params
  );
};

const paymentManagerName = "NAME";
const params: PaymentManagerParams = {
  makerFee: new BN(0),
  takerFee: new BN(0),
  feeScale: new BN(0),
  authority: new PublicKey("AUTHORITY_KEY"),
};

main(paymentManagerName, params).catch((e) => console.log(e));
