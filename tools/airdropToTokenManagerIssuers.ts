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
import { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { tryGetAccount } from "../src";
import { getTokenManager } from "../src/programs/tokenManager/accounts";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import { connectionFor } from "./connection";

import { createMintTransaction } from "./utils";

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
  const tokenManagerIds = await Promise.all(
    mintIds.map((mint) => findTokenManagerAddress(mint))
  );

  const tokenManagerDatas = (
    await Promise.all(
      tokenManagerIds.map((tmId) =>
        tryGetAccount(() => getTokenManager(connection, tmId[0]))
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
      const [masterEditionTokenAccountId] = await createMintTransaction(
        masterEditionTransaction,
        connection,
        new SignerWallet(wallet),
        wallet.publicKey,
        masterEditionMint.publicKey,
        1,
        wallet.publicKey,
        issuer // receiver
      );

      const masterEditionMetadataId = await Metadata.getPDA(
        masterEditionMint.publicKey
      );
      const metadataTx = new CreateMetadataV2(
        { feePayer: wallet.publicKey },
        {
          metadata: masterEditionMetadataId,
          metadataData: new DataV2({
            name: metadata.name,
            symbol: metadata.symbol,
            uri: metadata.uri,
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
        `Airdropped token to ${issuer?.toString()} wallet with mintId=(${masterEditionMint.publicKey.toString()}) masterEditionId=(${masterEditionId.toString()}) metadataId=(${masterEditionMetadataId.toString()}) tokenAccount=(${masterEditionTokenAccountId.toString()})\n`
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
