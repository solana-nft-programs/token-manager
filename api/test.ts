import { PublicKey } from "@solana/web3.js";

import { getTokenManagersForIssuer } from "../src/programs/tokenManager/accounts";
import { connectionFor } from "./utils";

const tokenManagersForIssuer = async () => {
  const connection = connectionFor("mainnet");

  const tokenManagers = await getTokenManagersForIssuer(
    connection,
    new PublicKey("twLqUrEvBPdtWFusa4MSWqkyE7TyhJTv3xBXiLYUNcX")
  );

  console.log(tokenManagers);
};

tokenManagersForIssuer()
  .then((links) => {
    console.log(links);
  })
  .catch((e) => {
    console.log(e);
  });
