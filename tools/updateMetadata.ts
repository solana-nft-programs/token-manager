import {
  Creator,
  DataV2,
  Metadata,
  UpdateMetadataV2,
} from "@metaplex-foundation/mpl-token-metadata";
import { utils } from "@project-serum/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  Keypair,
  sendAndConfirmRawTransaction,
  Transaction,
} from "@solana/web3.js";
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
        `https://nft.cardinal.so/metadata/${mintId.toString()}?uri=${metadataUrl}&text=header:${dayName}%20${floor}F%20S${counter}&attrs=Day:${dayName};Floor:${floor};Seat:${counter}`
      );
      const metadataId = await Metadata.getPDA(mintId);
      const metadataTx = new UpdateMetadataV2(
        { feePayer: wallet.publicKey },
        {
          metadata: metadataId,
          metadataData: new DataV2({
            name: `EmpireDAO #${floor}.${counter} (${daySymbol})`,
            symbol: daySymbol,
            uri: `https://nft.cardinal.so/metadata/${mintId.toString()}?uri=${metadataUrl}&text=header:${dayName}%20${floor}F%20S${counter}&attrs=Day:${dayName};Floor:${floor};Seat:${counter}`,
            sellerFeeBasisPoints: 10,
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
        }
      );

      const transaction = new Transaction();
      transaction.instructions = [...metadataTx.instructions];
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
  "https://rent.cardinal.so/metadata/empiredao.json",
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
