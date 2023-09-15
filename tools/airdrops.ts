import { BN, utils } from "@coral-xyz/anchor";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import type { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import {
  createMintIxs,
  findMintEditionId,
  findMintMetadataId,
} from "@solana-nft-programs/common";

import { connectionFor } from "./connection";

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
);

const METADATA_URI =
  "https://arweave.net/JYP2QIEmcMC_sY22kD9xlJE7jWR9h8gGY8B_zHqnPQI";

export const airdropMasterEdition = async (
  metadataUrl: string = METADATA_URI,
  num = 1,
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
      const [ixs] = await createMintIxs(
        connection,
        masterEditionMint.publicKey,
        wallet.publicKey
      );
      masterEditionTransaction.instructions = [
        ...masterEditionTransaction.instructions,
        ...ixs,
      ];

      const masterEditionMetadataId = findMintMetadataId(
        masterEditionMint.publicKey
      );
      const metadataIx = createCreateMetadataAccountV3Instruction(
        {
          metadata: masterEditionMetadataId,
          updateAuthority: wallet.publicKey,
          mint: masterEditionMint.publicKey,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: `Test #${counter}`,
              symbol: "TEST",
              uri: metadataUrl,
              sellerFeeBasisPoints: 0,
              creators: [
                {
                  address: wallet.publicKey,
                  verified: true,
                  share: 100,
                },
              ],
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      );
      const masterEditionId = findMintEditionId(masterEditionMint.publicKey);
      const masterEditionIx = createCreateMasterEditionV3Instruction(
        {
          edition: masterEditionId,
          metadata: masterEditionMetadataId,
          updateAuthority: wallet.publicKey,
          mint: masterEditionMint.publicKey,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
        },
        {
          createMasterEditionArgs: {
            maxSupply: new BN(0),
          },
        }
      );

      const transaction = new Transaction();
      transaction.instructions = [
        ...masterEditionTransaction.instructions,
        metadataIx,
        masterEditionIx,
      ];
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash("max")
      ).blockhash;
      transaction.sign(wallet, masterEditionMint);
      const txid = await sendAndConfirmRawTransaction(
        connection,
        transaction.serialize(),
        {
          commitment: "confirmed",
        }
      );
      console.log(
        `[success] https://explorer.solana.com/tx/${txid}?cluster=${cluster}`
      );
      allMintIds.push(masterEditionMint.publicKey);
      counter += 1;
    } catch (e) {
      console.log("Failed", e);
    }
  }

  return allMintIds;
};

airdropMasterEdition()
  .then((allMintIds) => {
    console.log(allMintIds.map((pk) => pk.toString()));
  })
  .catch((e) => {
    console.log(e);
  });
