import { getTransferAuthority } from "../src/programs/transferAuthority/accounts";
import { findTransferAuthorityAddress } from "../src/programs/transferAuthority/pda";
import { connectionFor } from "./connection";

const transferAuthorityName = "global";

const main = async (cluster = "devnet") => {
  const connection = connectionFor(cluster);
  const transferAuthorityId = findTransferAuthorityAddress(
    transferAuthorityName
  );

  const transferAuthorityData = await getTransferAuthority(
    connection,
    transferAuthorityId
  );
  console.log("transferAuthorityData", transferAuthorityData);
};

main().catch((e) => console.log(e));
