import * as anchor from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import { PublicKey } from "@solana/web3.js";
import * as web3Js from "@solana/web3.js";

import { executeTransaction } from "./utils";
import { tryGetAccount, withUpdateMarketplace } from "../src";
import { connectionFor } from "./connection";
import { getMarketplaceByName } from "../src/programs/listingAuthority/accounts";

const wallet = web3Js.Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(anchor.utils.bytes.bs58.encode([]))
); // your wallet's secret key
export type PaymentManagerParams = {
  feeCollector: PublicKey;
  authority: PublicKey;
  makerFeeBasisPoints: number;
  takerFeeBasisPoints: number;
};

const main = async (
  marketplaceName: string,
  transferAuthorityName: string,
  paymentManagerName: string,
  cluster = "devnet"
) => {
  const connection = connectionFor(cluster);
  const transaction = new web3Js.Transaction();
  await withUpdateMarketplace(
    transaction,
    connection,
    new SignerWallet(wallet),
    marketplaceName,
    transferAuthorityName,
    paymentManagerName,
    new PublicKey("cpmaMZyBQiPxpeuxNsQhW7N8z1o9yaNdLgiPhWGUEiX"),
    []
  );
  try {
    await executeTransaction(
      connection,
      new SignerWallet(wallet),
      transaction,
      {}
    );
  } catch (e) {
    console.log(`Transactionn failed: ${e}`);
  }
  const marketplaceData = await tryGetAccount(() =>
    getMarketplaceByName(connection, marketplaceName)
  );
  if (!marketplaceData) {
    console.log("Error: Failed to create payment manager");
  } else {
    console.log(`Created payment manager ${paymentManagerName}`);
  }
};

const marketplaceName = "cardinal";
const transferAuthorityName = "global";
const paymentManagerName = "cardinal-marketplace";

main(marketplaceName, transferAuthorityName, paymentManagerName).catch((e) =>
  console.log(e)
);
