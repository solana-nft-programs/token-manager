import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  Creator,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN, utils } from "@project-serum/anchor";
import { SignerWallet } from "@saberhq/solana-contrib";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { connectionFor } from "./connection";

import { createMintTransaction } from "./utils";

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
);

export const airdropMasterEdition = async (
  metadataUrl: string,
  num: number,
  cluster = "devnet",
  startNum = 0
) => {
  const allMintIds: PublicKey[] = [];
  const connection = connectionFor(cluster);

  ////////////////////////////////////////////
  ///////////// Master Edition ///////////////
  ////////////////////////////////////////////
  let counter = startNum;
  for (let i = 0; i < num; i++) {
    console.log(`----------(${i}/${num})--------------`);

    try {
      const masterEditionTransaction = new Transaction();
      const masterEditionMint = Keypair.generate();
      const [masterEditionTokenAccountId] = await createMintTransaction(
        masterEditionTransaction,
        connection,
        new SignerWallet(wallet),
        wallet.publicKey,
        masterEditionMint.publicKey,
        1
      );

      const masterEditionMetadataId = await Metadata.getPDA(
        masterEditionMint.publicKey
      );
      const metadataTx = new CreateMetadataV2(
        { feePayer: wallet.publicKey },
        {
          metadata: masterEditionMetadataId,
          metadataData: new DataV2({
            name: `DeGod Event Ticket #${counter}`,
            symbol: "DGOD",
            uri: metadataUrl,
            sellerFeeBasisPoints: 0,
            creators: [
              new Creator({
                address: wallet.publicKey.toString(),
                verified: true,
                share: 100,
              }),
            ],
            collection: null,
            uses: null,
          }),
          updateAuthority: wallet.publicKey,
          mint: masterEditionMint.publicKey,
          mintAuthority: wallet.publicKey,
        }
      );

      const masterEditionId = await MasterEdition.getPDA(
        masterEditionMint.publicKey
      );
      const masterEditionTx = new CreateMasterEditionV3(
        {
          feePayer: wallet.publicKey,
          recentBlockhash: (await connection.getRecentBlockhash("max"))
            .blockhash,
        },
        {
          edition: masterEditionId,
          metadata: masterEditionMetadataId,
          updateAuthority: wallet.publicKey,
          mint: masterEditionMint.publicKey,
          mintAuthority: wallet.publicKey,
          maxSupply: new BN(0),
        }
      );

      const transaction = new Transaction();
      transaction.instructions = [
        ...masterEditionTransaction.instructions,
        ...metadataTx.instructions,
        ...masterEditionTx.instructions,
      ];
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash("max")
      ).blockhash;
      transaction.sign(wallet, masterEditionMint);
      await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
        commitment: "confirmed",
      });
      console.log(
        `Master edition data created mintId=(${masterEditionMint.publicKey.toString()}) masterEditionId=(${masterEditionId.toString()}) metadataId=(${masterEditionMetadataId.toString()}) tokenAccount=(${masterEditionTokenAccountId.toString()})`
      );
      allMintIds.push(masterEditionMint.publicKey);
      counter += 1;
    } catch (e) {
      console.log("Failed", e);
    }
  }

  return allMintIds;
};

airdropMasterEdition(
  "https://nft.cardinal.so/metadata/?event=degods-solympus",
  2,
  "mainnet",
  10
)
  .then((allMintIds) => {
    console.log(allMintIds.map((pk) => pk.toString()));
  })
  .catch((e) => {
    console.log(e);
  });
