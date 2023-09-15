import { utils } from "@coral-xyz/anchor";
import { createUpdateMetadataAccountV2Instruction } from "@metaplex-foundation/mpl-token-metadata";
import {
  Keypair,
  PublicKey,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
import { findMintMetadataId } from "@solana-nft-programs/common";

import { connectionFor } from "./connection";

const wallet = Keypair.fromSecretKey(
  utils.bytes.bs58.decode(process.env.AIRDROP_KEY || "")
);

const MINTS_IDS = [new PublicKey("")];

const DAY_MAPPING: { [day: string]: string } = {
  SUN: "Sunday",
  MON: "Monday",
  TUES: "Tuesday",
  WEDS: "Wednesday",
  THURS: "Thursday",
  FRI: "Friday",
  SAT: "Saturday",
};

const DAY = "SUN";
const FLOOR = 5;

const updateMetadata = async (
  mintIds: PublicKey[],
  metadataUrl: string,
  daySymbol: string,
  cluster: string,
  floor = 3,
  startNum = 0
): Promise<PublicKey[]> => {
  const dayName = DAY_MAPPING[daySymbol]!;
  if (!dayName) throw new Error("Day not found");
  const allMintIds: PublicKey[] = [];
  const connection = connectionFor(cluster);
  let counter = startNum;
  for (let i = 0; i < mintIds.length; i++) {
    console.log(`----------(${i}/${mintIds.length})--------------`);

    try {
      const mintId = mintIds[i]!;
      console.log(
        `https://nft.host.so/metadata/${mintId.toString()}?uri=${metadataUrl}&text=header:${dayName}%20${floor}F%20S${counter}&attrs=Day:${dayName};Floor:${floor};Seat:${counter}`
      );
      const metadataId = findMintMetadataId(mintId);
      const metadataIx = createUpdateMetadataAccountV2Instruction(
        {
          metadata: metadataId,
          updateAuthority: wallet.publicKey,
        },
        {
          updateMetadataAccountArgsV2: {
            data: {
              name: `EmpireDAO #${floor}.${counter} (${daySymbol})`,
              symbol: daySymbol,
              uri: `https://nft.host.so/metadata/${mintId.toString()}?uri=${metadataUrl}&text=header:${dayName}%20${floor}F%20S${counter}&attrs=Day:${dayName};Floor:${floor};Seat:${counter}`,
              sellerFeeBasisPoints: 10,
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
            primarySaleHappened: false,
            isMutable: true,
            updateAuthority: wallet.publicKey,
          },
        }
      );

      const transaction = new Transaction();
      transaction.instructions = [metadataIx];
      transaction.feePayer = wallet.publicKey;
      transaction.recentBlockhash = (
        await connection.getRecentBlockhash("max")
      ).blockhash;
      transaction.sign(wallet);
      await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
        commitment: "confirmed",
      });
      console.log(
        `Master edition data created mintId=(${mintId.toString()}) metadataId=(${metadataId.toString()}))`
      );
      allMintIds.push(mintId);
      counter += 1;
    } catch (e) {
      console.log("Failed", e);
    }
  }
  return allMintIds;
};

updateMetadata(
  MINTS_IDS,
  "https://rent.host.so/metadata/empiredao.json",
  DAY,
  "mainnet",
  FLOOR
)
  .then((allMintIds) => {
    console.log(allMintIds.map((pk) => pk.toString()));
  })
  .catch((e) => {
    console.log(e);
  });
