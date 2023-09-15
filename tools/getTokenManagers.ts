import type { PublicKey } from "@solana/web3.js";
import type { AccountData } from "@solana-nft-programs/common";

import type { TokenManagerData } from "../src/programs/tokenManager";
import { getTokenManagers } from "../src/programs/tokenManager/accounts";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import { connectionFor } from "./connection";

const main = async (mintIds: PublicKey[], cluster = "devnet") => {
  const connection = connectionFor(cluster);

  const tokenManagerIds = mintIds.map((mintId) =>
    findTokenManagerAddress(mintId)
  );
  const tokenManagers = (
    await getTokenManagers(connection, tokenManagerIds)
  ).filter((x): x is AccountData<TokenManagerData | null> => x.parsed !== null);

  console.log("tokenManagers", tokenManagers.length);
};

main([]).catch((e) => console.log(e));
