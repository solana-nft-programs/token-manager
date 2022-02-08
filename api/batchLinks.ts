import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  DataV2,
  Edition,
  EditionMarker,
  MasterEdition,
  Metadata,
  MintNewEditionFromMasterEditionViaToken,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN, utils } from "@project-serum/anchor";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import { Keypair } from "@solana/web3.js";

import { claimLinks } from "../src";
import { getLink } from "../src/claimLinks";
import { TokenManagerKind } from "../src/programs/tokenManager";
import { connectionFor, createMint } from "./utils";

console.log(
  utils.bytes.bs58.encode([
    97, 221, 81, 206, 33, 154, 180, 198, 241, 71, 117, 223, 205, 77, 12, 35, 70,
    66, 32, 21, 118, 95, 104, 18, 195, 163, 179, 36, 205, 154, 205, 23, 13, 78,
    16, 226, 117, 81, 58, 240, 152, 241, 171, 18, 168, 64, 38, 196, 236, 219,
    15, 144, 100, 57, 210, 114, 161, 3, 44, 252, 203, 245, 217, 72,
  ])
);
// twLqUrEvBPdtWFusa4MSWqkyE7TyhJTv3xBXiLYUNcX
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(
    process.env.AIRDROP_KEY ||
      "2xV66X7TbAtTHG4bziYKAJxMQPiw2FEbjVmJJzHc84baZp7Sct654Y1WMFT279sg6g1mEznowKkvJiHPiC9QsFX5"
  )
);

const getLinks = async (
  metadataUrl: string,
  numLinks: number,
  cluster = "devnet"
) => {
  const allLinks = [];
  const connection = connectionFor(cluster);

  ////////////////////////////////////////////
  ///////////// Master Edition ///////////////
  ////////////////////////////////////////////
  const [masterEditionTokenAccountId, masterEditionMint] = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    1,
    wallet.publicKey
  );

  const masterEditionMetadataId = await Metadata.getPDA(
    masterEditionMint.publicKey
  );
  const metadataTx = new CreateMetadataV2(
    { feePayer: wallet.publicKey },
    {
      metadata: masterEditionMetadataId,
      metadataData: new DataV2({
        name: "Hacker House",
        symbol: "HH",
        uri: `${metadataUrl}`,
        sellerFeeBasisPoints: 10,
        creators: null,
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
      recentBlockhash: (await connection.getRecentBlockhash("max")).blockhash,
    },
    {
      edition: masterEditionId,
      metadata: masterEditionMetadataId,
      updateAuthority: wallet.publicKey,
      mint: masterEditionMint.publicKey,
      mintAuthority: wallet.publicKey,
      maxSupply: new BN(1),
    }
  );
  const txEnvelope = new TransactionEnvelope(
    SolanaProvider.init({
      connection: connection,
      wallet: new SignerWallet(wallet),
      opts: {
        commitment: "singleGossip",
      },
    }),
    [...metadataTx.instructions, ...masterEditionTx.instructions]
  );
  await txEnvelope.send({
    commitment: "singleGossip",
  });
  console.log(
    `Master edition (${masterEditionId.toString()}) created with metadata (${masterEditionMetadataId.toString()})`
  );

  ////////////////////////////////////////////
  //////////////// Editions //////////////////
  ////////////////////////////////////////////
  for (let i = 0; i < numLinks; i++) {
    // create edition mint
    const [editionTokenAccountId, editionMint] = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      1,
      wallet.publicKey
    );
    console.log(`Edition mint created (${editionMint.publicKey.toString()})`);

    const editionMetadataId = await Metadata.getPDA(editionMint.publicKey);

    const editionNumber = new BN(i);
    const editionId = await Edition.getPDA(editionMint.publicKey);
    const editionMarkerId = await EditionMarker.getPDA(
      masterEditionMint.publicKey,
      editionNumber
    );
    const editionTx = new MintNewEditionFromMasterEditionViaToken(
      {
        feePayer: wallet.publicKey,
      },
      {
        edition: editionId,
        metadata: editionMetadataId,
        updateAuthority: wallet.publicKey,
        mint: editionMint.publicKey,
        mintAuthority: wallet.publicKey,
        masterEdition: masterEditionId,
        masterMetadata: masterEditionMetadataId,
        editionMarker: editionMarkerId,
        tokenOwner: wallet.publicKey,
        tokenAccount: masterEditionTokenAccountId,
        editionValue: editionNumber,
      }
    );
    const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
      connection,
      new SignerWallet(wallet),
      {
        rentalMint: editionMint.publicKey,
        issuerTokenAccountId: editionTokenAccountId,
        usages: 4,
        kind: TokenManagerKind.Edition,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: connection,
        wallet: new SignerWallet(wallet),
        opts: {
          commitment: "singleGossip",
        },
      }),
      [...editionTx.instructions, ...transaction.instructions]
    );
    await txEnvelope.send({
      commitment: "singleGossip",
    });
    console.log(
      `Edition data created editionId=(${editionId.toString()}) marker=(${editionMarkerId.toString()})`
    );

    const claimLink = getLink(tokenManagerId, otp, cluster);
    allLinks.push(claimLink);
  }

  return allLinks;
};

getLinks("https://arweave.net/DLDhnabWSXzAYktEhEKyukt3GIfagj2rPpWncw-KDQo", 1)
  .then((links) => {
    console.log(links);
  })
  .catch((e) => {
    console.log(e);
  });
