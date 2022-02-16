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
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";

import { claimLinks } from "../src";
import { getLink } from "../src/claimLinks";
import {
  InvalidationType,
  TokenManagerKind,
} from "../src/programs/tokenManager";
import { connectionFor, createMintTransaction } from "./utils";

// twLqUrEvBPdtWFusa4MSWqkyE7TyhJTv3xBXiLYUNcX
const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
);

export const getEditionLinks = async (
  metadataUrl: string,
  numLinks: number,
  cluster = "devnet",
  baseUrl = "https://beta.cardinal.so"
) => {
  const allLinks = [];
  const connection = connectionFor(cluster);

  ////////////////////////////////////////////
  ///////////// Master Edition ///////////////
  ////////////////////////////////////////////
  // const [masterEditionTokenAccountId, masterEditionMint] = await createMint(
  //   connection,
  //   wallet,
  //   wallet.publicKey,
  //   1,
  //   wallet.publicKey
  // );
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
      maxSupply: new BN(numLinks),
    }
  );
  const txEnvelope = new TransactionEnvelope(
    SolanaProvider.init({
      connection: connection,
      wallet: new SignerWallet(wallet),
      opts: {
        commitment: "finalized",
      },
    }),
    [
      ...masterEditionTransaction.instructions,
      ...metadataTx.instructions,
      ...masterEditionTx.instructions,
    ],
    [masterEditionMint]
  );
  await txEnvelope.send({
    commitment: "finalized",
  });
  console.log(
    `Master edition (${masterEditionId.toString()}) created with metadata (${masterEditionMetadataId.toString()})`
  );

  ////////////////////////////////////////////
  //////////////// Editions //////////////////
  ////////////////////////////////////////////
  for (let i = 0; i < numLinks; i++) {
    // create edition mint
    // const [editionTokenAccountId, editionMint] = await createMint(
    //   connection,
    //   wallet,
    //   wallet.publicKey,
    //   1,
    //   wallet.publicKey
    // );
    const editionMint = Keypair.generate();
    const editionTransaction = new Transaction();
    const [editionTokenAccountId] = await createMintTransaction(
      editionTransaction,
      connection,
      new SignerWallet(wallet),
      wallet.publicKey,
      editionMint.publicKey,
      1
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
        mint: editionMint.publicKey,
        issuerTokenAccountId: editionTokenAccountId,
        usages: 1,
        kind: TokenManagerKind.Edition,
        invalidationType: InvalidationType.Invalidate,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: connection,
        wallet: new SignerWallet(wallet),
        opts: {
          commitment: "finalized",
        },
      }),
      [
        ...editionTransaction.instructions,
        ...editionTx.instructions,
        ...transaction.instructions,
      ],
      [editionMint]
    );
    await txEnvelope.send({
      commitment: "finalized",
    });
    console.log(
      `Edition data created editionId=(${editionId.toString()}) marker=(${editionMarkerId.toString()})`
    );

    const claimLink = getLink(tokenManagerId, otp, cluster, `${baseUrl}/claim`);
    allLinks.push(claimLink);
  }

  return allLinks;
};

export const getMasterEditionLinks = async (
  metadataUrl: string,
  numLinks: number,
  cluster = "devnet",
  baseUrl = "https://beta.cardinal.so"
) => {
  const allLinks = [];
  const connection = connectionFor(cluster);

  ////////////////////////////////////////////
  ///////////// Master Edition ///////////////
  ////////////////////////////////////////////
  for (let i = 0; i < numLinks; i++) {
    console.log(`----------(${i}/${numLinks})--------------`);

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
            name: "Hacker House",
            symbol: "HH",
            uri: `${metadataUrl}`,
            // uri: `https://api.cardinal.so/metadata/${masterEditionMint.publicKey.toString()}?uri=${metadataUrl}`,
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
          recentBlockhash: (await connection.getRecentBlockhash("max"))
            .blockhash,
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

      const [issueTransaction, tokenManagerId, otp] =
        await claimLinks.issueToken(connection, new SignerWallet(wallet), {
          mint: masterEditionMint.publicKey,
          issuerTokenAccountId: masterEditionTokenAccountId,
          usages: 1,
          kind: TokenManagerKind.Edition,
          invalidationType: InvalidationType.Invalidate,
        });

      const transaction = new Transaction();
      transaction.instructions = [
        ...masterEditionTransaction.instructions,
        ...metadataTx.instructions,
        ...masterEditionTx.instructions,
        ...issueTransaction.instructions,
      ];
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash("max")
      ).blockhash;
      transaction.sign(wallet, masterEditionMint);
      await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
        commitment: "confirmed",
      });
      // const txEnvelope = new TransactionEnvelope(
      //   SolanaProvider.init({
      //     connection: connection,
      //     wallet: new SignerWallet(wallet),
      //     opts: {
      //       commitment: "max",
      //     },
      //   }),
      //   [
      //     ...masterEditionTransaction.instructions,
      //     ...metadataTx.instructions,
      //     ...masterEditionTx.instructions,
      //     ...issueTransaction.instructions,
      //   ],
      //   [masterEditionMint]
      // );
      // await txEnvelope.send({
      //   commitment: "max",
      // });

      const claimLink = getLink(
        tokenManagerId,
        otp,
        cluster,
        `${baseUrl}/claim`
      );

      const tkm = await connection.getAccountInfo(tokenManagerId);
      if (!tkm) {
        console.log("Missing token manager", tokenManagerId.toString());
      } else {
        console.log(
          `Master edition data created mintId=(${masterEditionMint.publicKey.toString()}) masterEditionId=(${masterEditionId.toString()}) metadataId=(${masterEditionMetadataId.toString()}) link=(${claimLink})`
        );
        allLinks.push(claimLink);
      }
    } catch (e) {
      console.log("Failed", e);
    }
  }

  return allLinks;
};

getMasterEditionLinks(
  "https://2dhgxu5jouo2so3r7xnc6j2pbawfdzqmuyrmuql2ttep4p23zsga.arweave.net/0M5r06l1Hak7cf3aLydPCCxR5gymIspBepzI_j9bzIw/",
  1,
  "mainnet"
)
  .then((links) => {
    console.log(links);
  })
  .catch((e) => {
    console.log(e);
  });
