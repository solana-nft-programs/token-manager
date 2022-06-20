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

const MINTS_IDS = [
  new PublicKey("7gkKNwhcGyp3oiCNijm118U8h7G5kTAiLbaCkm5mSSH"),
  new PublicKey("5GD1mdhSJ2wjVdhArJwFjHbWTZdFmr7L47hQkiv9XUQ2"),
  new PublicKey("9Z1P4GyMwPo3D2gWaYXkDqXyzs1fhzQwHzyTqDt3DXZm"),
  new PublicKey("7v6NNfUN3EwDurFLPsyuyq44ssatqZAyGRs9sC877wfL"),
  new PublicKey("FMqUXu4HuN9CJbFmtKKmk1E1Y3g8ZPNsz9PcjMMTVF3D"),
  new PublicKey("JCGZ9PdscH1FWzFbTScCxEBL9iGvrug2zQBHNnwRsGhi"),
  new PublicKey("Dt4Lc51xV6piVfpaE6fJrmzEEB325JwkKRmr9uLL3fCn"),
  new PublicKey("JAaJZrzHcQuUyXnY5e4BbHo1KMmJjeJdpaxZUk1JqfEi"),
  new PublicKey("DVQVG5uLjXsCJA4pZWDQkyUHPS2F7j8mjfx3FrMuYhir"),
  new PublicKey("Hf2un8t9ajBehK8e8bqEKKzks7DG6xCBh6QibNi5oi8S"),
  new PublicKey("A5Bf6PcyjNiAvRTsCNHdducBpZfEE4Rk4migNA9y8er8"),
  new PublicKey("F6UhiD8xtZDQaRMh1MZA6Usd7ifP8y1jbVMGyLPyvsCD"),
  new PublicKey("5fZZFSWu7Rw7fJmWe7UohsysK6pYtCNvbDWxcKyZRxB6"),
  new PublicKey("98TvuhTSfQbkygBVT94gGH7XZSHvWGCd36gHbujrL1xP"),
  new PublicKey("8DPW4KNkPYciMR1Q9V1mzv4dJ3CwrhusaxG2ekUzyD3f"),
  new PublicKey("3xZFJQnDRqB3N2JWdH1jnAYPzT4q8nGfPNNjLxesXR14"),
  new PublicKey("ACAqYSicApjopWFvh37AvVtKpugQPJwpy9WbtU33mmGk"),
  new PublicKey("LffPS5XFcnfJQQciEgAUXfMQo4nskEFyh5STugH7Pp2"),
  new PublicKey("EYhrXnyEboS2tJC8J1587Ke89zYMk5CDmbmdwV6YPkFJ"),
  new PublicKey("53k1yzHW4gPWmAVp9u5rNWBMdg8eLUY3oeBWeJHA6yG2"),
  new PublicKey("7zeaR2wbMpaTgziaDZJFZBKQ4ZoZBRkh6o4V2q71Tb7g"),
  new PublicKey("3wkhPxc1N8adG4hDPxpcq4kSDCzHu4YDJS42F4Uigjz1"),
  new PublicKey("5nDtP66ju8bDYMnMD1oMbZ3PKpL3dsCW54eFbLDKkXAq"),
  new PublicKey("4y9KM9bFErmYWDBiwdv8KGEAKJmUxRMSmXVyJnhjtWUs"),
  new PublicKey("E4AWbfwZ6BDtyh9xe1vxU7UekHJLyYXRCq5romQnX8u4"),
  new PublicKey("4ZTG3yUTRFhUinx3Z6bk662PtXzvgAiWJQT7B9tueotK"),
  new PublicKey("GPLRvoMGZigPPUS5E5kqqEFL5ESCySkkE32e4d1vYpej"),
  new PublicKey("RqCbLCCVTrE9To3r49x7yLjtFbCUKUA3Fibk6j24WuT"),
  new PublicKey("DVC6CakG6H3dxZFsTHDTiwWhetc1c7YJLW6mMCD6HcbG"),
  new PublicKey("CnPjaP5p34hzvMk1vTa95cVTEVkSbatQzpMDnPXEYFKM"),
  new PublicKey("6hQ3ko1ETk8NiLWgqptRqe98QXLEvaVbBoqS8jK3bXev"),
  new PublicKey("JwebLajACksGfgkt9Ud8kCsVWhyvN8sMotD4wey3338"),
  new PublicKey("3NqNXDsJuqd2s6ziVmsD9Cj3mZU8NgUiMJsaPUXBdoU1"),
  new PublicKey("42AqaYUhR1MUzEeaaXnvYHpKtvLg2QrsckSuf1ByqjwS"),
  new PublicKey("12GVQC6xSsFxUrXXEfyYfxy7LutjoEMcX1Gqvx2bm2LF"),
  new PublicKey("BcE6FMqzRSu7iweCKmrTkVGgrTkXUX3FaExNnFe7fWTX"),
  new PublicKey("7wXKfXyGn6cBj13w9QLjhtLB22171MnUTKseFHPH5swE"),
  new PublicKey("DLUbtr7ERBUqwaQfamRfpYSyPbPrAQnYP2b5QjookJnG"),
];

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
