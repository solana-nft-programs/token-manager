import {
  createMintIxs,
  findMintEditionId,
  findMintMetadataId,
  tryGetAccount,
} from "@cardinal/common";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN, utils } from "@project-serum/anchor";
import {
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import { getTokenManager } from "../src/programs/tokenManager/accounts";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import { connectionFor } from "./connection";

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
); // also creator of airdropped tokens

export const airdropToTokenManagerIssuers = async (
  mintIds: PublicKey[],
  metadata: {
    name: string;
    symbol: string;
    uri: string;
  },
  cluster = "devnet"
) => {
  const allMintIds: PublicKey[] = [];
  const connection = connectionFor(cluster);

  // find token managers
  const tokenManagerIds = mintIds.map((mint) => findTokenManagerAddress(mint));

  const tokenManagerDatas = (
    await Promise.all(
      tokenManagerIds.map((tmId) =>
        tryGetAccount(() => getTokenManager(connection, tmId))
      )
    )
  ).filter((tm) => !!tm);
  console.log(`Found ${tokenManagerDatas.length} issuers to airdrop`);

  // airdrop token
  for (let i = 0; i < tokenManagerDatas.length; i++) {
    const tokenManager = tokenManagerDatas[i];
    const issuer = tokenManager?.parsed.issuer;

    ////////////////////////////////////////////
    ///////////// Master Edition ///////////////
    ////////////////////////////////////////////
    console.log(
      `----------(${i + 1}/${tokenManagerDatas.length})--------------`
    );

    try {
      const masterEditionTransaction = new Transaction();
      const masterEditionMint = Keypair.generate();
      const [ixs] = await createMintIxs(
        connection,
        masterEditionMint.publicKey,
        wallet.publicKey,
        { target: issuer }
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
              name: metadata.name,
              symbol: metadata.symbol,
              uri: metadata.uri,
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
      await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
        commitment: "confirmed",
      });
      console.log(
        `Airdropped token to ${
          issuer ? issuer.toString() : ""
        } wallet with mintId=(${masterEditionMint.publicKey.toString()}) masterEditionId=(${masterEditionId.toString()}) metadataId=(${masterEditionMetadataId.toString()}))\n`
      );
      allMintIds.push(masterEditionMint.publicKey);
    } catch (e) {
      console.log("Failed", e);
    }
  }

  return allMintIds;
};

const HOLDER_MINT_IDS: string[] = [];
airdropToTokenManagerIssuers(
  HOLDER_MINT_IDS.map((mint) => new PublicKey(mint)),
  {
    name: "",
    symbol: "",
    uri: "",
  }
)
  .then((allMintIds) => {
    console.log(
      "Mint ids of airdropped tokens:",
      allMintIds.map((pk) => pk.toString())
    );
  })
  .catch((e) => {
    console.log(e);
  });
