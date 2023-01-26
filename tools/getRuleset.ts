import { getLatestRuleSet } from "@metaplex-foundation/mpl-token-auth-rules";
import { PublicKey } from "@solana/web3.js";

import { connectionFor } from "./connection";

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const rulesetData = await connection.getAccountInfo(
    new PublicKey("A6VicqkGd4J9Bk5B3j8isT5yWHJ2yPMeGBDWM6PY1Zgf")
  );
  const data = rulesetData?.data as Buffer;
  console.log(getLatestRuleSet(data));
  console.log(
    [
      [
        11, 112, 101, 177, 227, 209, 124, 69, 56, 157, 82, 127, 107, 4, 195,
        205, 88, 184, 108, 115, 26, 160, 253, 181, 73, 182, 209, 188, 3, 248,
        41, 70,
      ],
      [
        6, 90, 221, 155, 145, 37, 147, 1, 52, 93, 145, 196, 185, 51, 127, 13, 0,
        233, 231, 42, 100, 49, 140, 113, 74, 117, 167, 186, 218, 100, 116, 205,
      ],
    ].map((k) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      PublicKey.decode(Buffer.from(k)).toString()
    )
  );
};

main().catch((e) => console.log(e));
