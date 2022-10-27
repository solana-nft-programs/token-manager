import * as anchor from "@project-serum/anchor";
import { AddressLookupTableProgram, Keypair } from "@solana/web3.js";

import { connectionFor } from "./connection";
import { createAndSendV0Tx } from "./utils";

// for environment variables
require("dotenv").config();

const wallet = Keypair.fromSecretKey(
  anchor.utils.bytes.bs58.decode(process.env.WALLET_KEYPAIR || "")
); // your wallet's secret key

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);

  const recentSlot = await connection.getSlot();
  const [createLutInstr, lutAddress] =
    AddressLookupTableProgram.createLookupTable({
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      recentSlot: recentSlot,
    });

  console.log("createLutInstr", lutAddress.toString());
  await createAndSendV0Tx(connection, wallet, [createLutInstr]);
};

main().catch((e) => console.log(e));
