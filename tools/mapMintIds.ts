import { PublicKey } from "@solana/web3.js";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";

const MINT_IDS: string[] = [""];

const main = async (
  mintIds: string[]
): Promise<{ mintId: string; tokenManagerId: string }[]> => {
  return Promise.all(
    mintIds.map(async (m) => ({
      mintId: m,
      tokenManagerId: (
        await findTokenManagerAddress(new PublicKey(m))
      )[0].toString(),
    }))
  );
};

main(MINT_IDS)
  .then((ids) => console.log(ids, ids.length))
  .catch((e) => console.log(e));
