// import { utils } from "@project-serum/anchor";
// import { SignerWallet } from "@saberhq/solana-contrib";
// import { Keypair } from "@solana/web3.js";

// import { claimLinks } from "../src";
// import { TokenManagerKind } from "../src/programs/tokenManager";
// import { createMint } from "../tests/utils";
// import { connectionFor } from "./utils";

// const wallet = Keypair.fromSecretKey(
//   utils.bytes.bs58.decode(process.env.TWITTER_SOLANA_KEY || "")
// );

// const getLinks = async (
//   metadataUrl: string,
//   numLinks: number,
//   cluster = "devnet"
// ) => {
//   const connection = connectionFor(cluster);

//   for (let i = 0; i < numLinks; i++) {
//     const [issuerTokenAccountId, mint] = await createMint(
//       connection,
//       wallet,
//       wallet.publicKey,
//       1,
//       wallet.publicKey
//     );

//     const [transaction, tokenManagerId, otp] = await claimLinks.issueToken(
//       connection,
//       new SignerWallet(wallet),
//       {
//         rentalMint: mint.publicKey,
//         issuerTokenAccountId,
//         usages: 4,
//         kind: TokenManagerKind.Edition,
//       }
//     );
//   }
// };
