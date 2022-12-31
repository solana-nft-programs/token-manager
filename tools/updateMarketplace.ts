import { executeTransaction, tryGetAccount } from "@cardinal/common";
import { utils, Wallet } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import * as web3Js from "@solana/web3.js";

import { withUpdateMarketplace } from "../src";
import { getMarketplaceByName } from "../src/programs/transferAuthority/accounts";
import { connectionFor } from "./connection";

const wallet = web3Js.Keypair.fromSecretKey(
  utils.bytes.bs58.decode(utils.bytes.bs58.encode([]))
); // your wallet's secret key
export type PaymentManagerParams = {
  feeCollector: PublicKey;
  authority: PublicKey;
  makerFeeBasisPoints: number;
  takerFeeBasisPoints: number;
};

const main = async (
  marketplaceName: string,
  paymentManagerName: string,
  cluster = "devnet"
) => {
  console.log(wallet.publicKey.toString());
  const connection = connectionFor(cluster);
  const transaction = new web3Js.Transaction();
  await withUpdateMarketplace(
    transaction,
    connection,
    new Wallet(wallet),
    marketplaceName,
    paymentManagerName,
    new PublicKey("cpmaMZyBQiPxpeuxNsQhW7N8z1o9yaNdLgiPhWGUEiX"),
    []
  );
  try {
    await executeTransaction(connection, transaction, new Wallet(wallet), {});
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
const paymentManagerName = "cardinal-marketplace";

main(marketplaceName, paymentManagerName, "devnet").catch((e) =>
  console.log(e)
);
