import * as anchor from "@project-serum/anchor";
import { AddressLookupTableProgram, Keypair, PublicKey } from "@solana/web3.js";

import { connectionFor } from "./connection";
import { createAndSendV0Tx } from "./utils";

// for environment variables
require("dotenv").config();

const wallet = Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(process.env.WALLET_KEYPAIR || "")
); // your wallet's secret key

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const lutAddress = new PublicKey(process.env.LOOKUP_TABLE || "");
  const accounts = [
    new PublicKey("mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM"),
  ];
  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: wallet.publicKey,
    authority: wallet.publicKey,
    lookupTable: lutAddress,
    addresses: accounts,
  });

  await createAndSendV0Tx(connection, wallet, [extendInstruction]);
};

main().catch((e) => console.log(e));
