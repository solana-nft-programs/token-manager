// import * as metaplex from "@metaplex-foundation/mpl-token-metadata";
// import * as anchor from "@project-serum/anchor";
// import * as spl from "@solana/spl-token";
// import type {
//   AccountInfo,
//   Connection,
//   ParsedAccountData,
// } from "@solana/web3.js";
// import { PublicKey, SystemProgram } from "@solana/web3.js";
// import fetch from "cross-fetch";

// import type { AccountData } from "../src";
// import {
//   claimApprover,
//   timeInvalidator,
//   tokenManager,
//   useInvalidator,
// } from "../src/programs";
// import type { PaidClaimApproverData } from "../src/programs/claimApprover";
// import type { TimeInvalidatorData } from "../src/programs/timeInvalidator";
// import type { TokenManagerData } from "../src/programs/tokenManager";
// import type { UseInvalidatorData } from "../src/programs/useInvalidator";
// import { tryTokenManagerAddressFromMint } from "./programs/tokenManager/pda";

// export async function findAssociatedTokenAddress(
//   walletAddress: PublicKey,
//   mintAddress: PublicKey
// ): Promise<PublicKey> {
//   return (
//     await PublicKey.findProgramAddress(
//       [
//         walletAddress.toBuffer(),
//         spl.TOKEN_PROGRAM_ID.toBuffer(),
//         mintAddress.toBuffer(),
//       ],
//       spl.ASSOCIATED_TOKEN_PROGRAM_ID
//     )
//   )[0];
// }

// export type TokenData = {
//   tokenAccount?: {
//     pubkey: PublicKey;
//     account: AccountInfo<ParsedAccountData>;
//   };
//   tokenManager?: AccountData<TokenManagerData>;
//   metaplexData?: { pubkey: PublicKey; data: metaplex.MetadataData } | null;
//   editionData?: metaplex.Edition;
//   metadata?: { pubkey: PublicKey; data: any } | null;
//   claimApprover?: AccountData<PaidClaimApproverData> | null;
//   useInvalidator?: AccountData<UseInvalidatorData> | null;
//   timeInvalidator?: AccountData<TimeInvalidatorData> | null;
//   recipientTokenAccount?: spl.AccountInfo | null;
// };

// export async function getTokenAccountsWithData(
//   connection: Connection,
//   addressId: string
// ): Promise<TokenData[]> {
//   const allTokenAccounts = await connection.getParsedTokenAccountsByOwner(
//     new PublicKey(addressId),
//     { programId: spl.TOKEN_PROGRAM_ID }
//   );
//   const tokenAccounts = allTokenAccounts.value
//     .filter(
//       (tokenAccount) =>
//         tokenAccount.account.data.parsed.info.tokenAmount.uiAmount > 0
//     )
//     .sort((a, b) => a.pubkey.toBase58().localeCompare(b.pubkey.toBase58()));

//   const metadataTuples: [
//     PublicKey,
//     PublicKey | null,
//     PublicKey | null,
//     PublicKey | null,
//     PublicKey
//   ][] = await Promise.all(
//     tokenAccounts.map(async (tokenAccount) => {
//       const [[metadataId], tokenManagerId] = await Promise.all([
//         PublicKey.findProgramAddress(
//           [
//             anchor.utils.bytes.utf8.encode(metaplex.MetadataProgram.PREFIX),
//             metaplex.MetadataProgram.PUBKEY.toBuffer(),
//             new PublicKey(
//               tokenAccount.account.data.parsed.info.mint
//             ).toBuffer(),
//           ],
//           metaplex.MetadataProgram.PUBKEY
//         ),
//         tryTokenManagerAddressFromMint(
//           connection,
//           new PublicKey(tokenAccount.account.data.parsed.info.mint)
//         ),
//       ]);

//       let timeInvalidatorId = null;
//       let useInvalidatorId = null;
//       if (tokenManagerId) {
//         [[timeInvalidatorId], [useInvalidatorId]] = await Promise.all([
//           timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId),
//           useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId),
//         ]);
//       }

//       return [
//         metadataId,
//         tokenManagerId,
//         timeInvalidatorId,
//         useInvalidatorId,
//         tokenAccount.pubkey,
//       ];
//     })
//   );

//   // @ts-ignore
//   const metadataIds: [PublicKey[], PublicKey[], PublicKey[], PublicKey[]] =
//     // @ts-ignore
//     metadataTuples.reduce(
//       (
//         acc,
//         [metaplexId, tokenManagerId, timeInvalidatorId, useInvalidatorId]
//       ) => [
//         [...acc[0], metaplexId],
//         [...acc[1], tokenManagerId],
//         [...acc[2], timeInvalidatorId],
//         [...acc[3], useInvalidatorId],
//       ],
//       [[], [], [], []]
//     );

//   const [
//     metaplexAccountInfos,
//     tokenManagers,
//     timeInvalidators,
//     useInvalidators,
//   ] = await Promise.all([
//     connection.getMultipleAccountsInfo(metadataIds[0]),
//     tokenManager.accounts.getTokenManagers(connection, metadataIds[1]),
//     timeInvalidator.accounts.getTimeInvalidators(connection, metadataIds[2]),
//     useInvalidator.accounts.getUseInvalidators(connection, metadataIds[3]),
//   ]);

//   const metaplexData = metaplexAccountInfos.map((accountInfo, i) => {
//     let md;
//     try {
//       md = {
//         pubkey: metadataIds[0][i]!,
//         ...accountInfo,
//         data: metaplex.MetadataData.deserialize(accountInfo?.data as Buffer),
//       };
//     } catch (e) {}
//     return md;
//   });

//   const metadata = await Promise.all(
//     metaplexData.map(async (md) => {
//       try {
//         if (!md?.data.data.uri) return null;
//         const json = await fetch(md.data.data.uri).then((r) => r.json());
//         return {
//           pubkey: md.pubkey,
//           data: json,
//         };
//       } catch (e) {
//         return null;
//       }
//     })
//   );

//   return metadataTuples.map(
//     ([
//       metaplexId,
//       tokenManagerId,
//       timeInvalidatorId,
//       useInvalidatorId,
//       tokenAccountId,
//     ]) => ({
//       tokenAccount: tokenAccounts.find((data) =>
//         data ? data.pubkey.toBase58() === tokenAccountId.toBase58() : undefined
//       ),
//       metaplexData: metaplexData.find((data) =>
//         data ? data.pubkey.toBase58() === metaplexId.toBase58() : undefined
//       ),
//       tokenManager: tokenManagers.find((tkm) =>
//         tkm?.parsed
//           ? tkm.pubkey.toBase58() === tokenManagerId?.toBase58()
//           : undefined
//       ),
//       metadata: metadata.find((data) =>
//         data ? data.pubkey.toBase58() === metaplexId.toBase58() : undefined
//       ),
//       useInvalidator: useInvalidators.find((data) =>
//         data?.parsed
//           ? data.pubkey.toBase58() === useInvalidatorId?.toBase58()
//           : undefined
//       ),
//       timeInvalidator: timeInvalidators.find((data) =>
//         data?.parsed
//           ? data.pubkey.toBase58() === timeInvalidatorId?.toBase58()
//           : undefined
//       ),
//     })
//   );
// }

// export async function getTokenDatas(
//   connection: Connection,
//   tokenManagerDatas: AccountData<TokenManagerData>[]
// ): Promise<TokenData[]> {
//   const metadataTuples: [
//     PublicKey,
//     PublicKey,
//     PublicKey,
//     PublicKey,
//     PublicKey,
//     PublicKey | null
//   ][] = await Promise.all(
//     tokenManagerDatas.map(async (tokenManagerData) => {
//       const [
//         [metadataId],
//         [claimApproverId],
//         [timeInvalidatorId],
//         [useInvalidatorId],
//       ] = await Promise.all([
//         PublicKey.findProgramAddress(
//           [
//             anchor.utils.bytes.utf8.encode(metaplex.MetadataProgram.PREFIX),
//             metaplex.MetadataProgram.PUBKEY.toBuffer(),
//             tokenManagerData.parsed.mint.toBuffer(),
//           ],
//           metaplex.MetadataProgram.PUBKEY
//         ),
//         claimApprover.pda.findClaimApproverAddress(tokenManagerData.pubkey),
//         timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerData.pubkey),
//         useInvalidator.pda.findUseInvalidatorAddress(tokenManagerData.pubkey),
//       ]);

//       const recipientTokenAccountId =
//         tokenManagerData.parsed.recipientTokenAccount?.toString() !==
//         SystemProgram.programId.toString()
//           ? tokenManagerData.parsed?.recipientTokenAccount
//           : null;
//       return [
//         metadataId,
//         tokenManagerData.pubkey,
//         claimApproverId,
//         timeInvalidatorId,
//         useInvalidatorId,
//         recipientTokenAccountId,
//       ];
//     })
//   );

//   const metadataIds: [
//     PublicKey[],
//     PublicKey[],
//     PublicKey[],
//     PublicKey[],
//     PublicKey[]
//   ] = metadataTuples.reduce(
//     (
//       acc,
//       [
//         metaplexId,
//         _tokenManagerId,
//         claimApproverId,
//         timeInvalidatorId,
//         useInvalidatorId,
//         recipientTokenAccountId,
//       ]
//     ) => [
//       [...acc[0], metaplexId],
//       [...acc[1], claimApproverId],
//       [...acc[2], timeInvalidatorId],
//       [...acc[3], useInvalidatorId],
//       [...acc[4], recipientTokenAccountId],
//     ],
//     [[], [], [], [], []]
//   );

//   const [
//     tokenAccounts,
//     metaplexAccountInfos,
//     claimApprovers,
//     timeInvalidators,
//     useInvalidators,
//   ] = await Promise.all([
//     connection
//       .getMultipleAccountsInfo(
//         metadataIds[4].filter((pk) => pk),
//         {
//           encoding: "jsonParsed",
//         }
//       )
//       .then((tokenAccounts) =>
//         tokenAccounts.map(
//           (acc) => (acc?.data as ParsedAccountData).parsed?.info
//         )
//       )
//       .catch((e) => {
//         console.log("Failed ot get token accounts", e);
//         return [];
//       }) as Promise<(spl.AccountInfo | null)[]>,
//     connection.getMultipleAccountsInfo(metadataIds[0]),
//     claimApprover.accounts.getClaimApprovers(connection, metadataIds[1]),
//     timeInvalidator.accounts.getTimeInvalidators(connection, metadataIds[2]),
//     useInvalidator.accounts.getUseInvalidators(connection, metadataIds[3]),
//   ]);

//   const metaplexData = metaplexAccountInfos.map((accountInfo, i) => {
//     let md;
//     try {
//       md = {
//         pubkey: metadataIds[0][i]!,
//         ...accountInfo,
//         data: metaplex.MetadataData.deserialize(accountInfo?.data as Buffer),
//       };
//     } catch (e) {}
//     return md;
//   });

//   const metadata = await Promise.all(
//     metaplexData.map(async (md) => {
//       try {
//         if (!md?.data.data.uri) return null;
//         const json = await fetch(md.data.data.uri).then((r) => r.json());
//         return {
//           pubkey: md.pubkey,
//           data: json,
//         };
//       } catch (e) {
//         // console.log(e)
//         return null;
//       }
//     })
//   );

//   return metadataTuples.map(
//     (
//       [
//         metaplexId,
//         tokenManagerId,
//         claimApproverId,
//         timeInvalidatorId,
//         useInvalidatorId,
//         _tokenAccountId,
//       ],
//       i
//     ) => ({
//       recipientTokenAccount: tokenAccounts.find((data) =>
//         data
//           ? data.delegate?.toString() === tokenManagerId?.toString()
//           : undefined
//       ),
//       metaplexData: metaplexData.find((data) =>
//         data ? data.pubkey.toBase58() === metaplexId.toBase58() : undefined
//       ),
//       tokenManager: tokenManagerDatas.find((tkm) =>
//         tkm?.parsed
//           ? tkm.pubkey.toBase58() === tokenManagerId?.toBase58()
//           : undefined
//       ),
//       metadata: metadata.find((data) =>
//         data ? data.pubkey.toBase58() === metaplexId.toBase58() : undefined
//       ),
//       claimApprover: claimApprovers.find((data) =>
//         data?.parsed
//           ? data.pubkey.toBase58() === claimApproverId?.toBase58()
//           : undefined
//       ),
//       useInvalidator: useInvalidators.find((data) =>
//         data?.parsed
//           ? data.pubkey.toBase58() === useInvalidatorId?.toBase58()
//           : undefined
//       ),
//       timeInvalidator: timeInvalidators.find((data) =>
//         data?.parsed
//           ? data.pubkey.toBase58() === timeInvalidatorId?.toBase58()
//           : undefined
//       ),
//     })
//   );
// }

// export async function getTokenData(
//   connection: Connection,
//   tokenManagerId: PublicKey
// ): Promise<TokenData> {
//   const tokenManagerData = await tokenManager.accounts.getTokenManager(
//     connection,
//     tokenManagerId
//   );

//   const mintId = tokenManagerData.parsed.mint;
//   const [[metaplexId]] = await Promise.all([
//     PublicKey.findProgramAddress(
//       [
//         anchor.utils.bytes.utf8.encode(metaplex.MetadataProgram.PREFIX),
//         metaplex.MetadataProgram.PUBKEY.toBuffer(),
//         mintId.toBuffer(),
//       ],
//       metaplex.MetadataProgram.PUBKEY
//     ),
//   ]);

//   const [[timeInvalidatorId], [useInvalidatorId]] = await Promise.all([
//     timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId),
//     useInvalidator.pda.findUseInvalidatorAddress(tokenManagerId),
//   ]);

//   let metaplexData: metaplex.Metadata | null = null;
//   let metadata: any | null = null;
//   let claimApproverData: AccountData<PaidClaimApproverData> | null = null;
//   let timeInvalidatorData: AccountData<TimeInvalidatorData> | null = null;
//   let useInvalidatorData: AccountData<UseInvalidatorData> | null = null;
//   let recipientTokenAccount: spl.AccountInfo | null = null;

//   try {
//     metaplexData = await metaplex.Metadata.load(connection, metaplexId);
//   } catch (e) {
//     console.log("Failed to get metaplex data", e);
//   }

//   if (metaplexData) {
//     try {
//       const json = await fetch(metaplexData?.data?.data?.uri).then((r) =>
//         r.json()
//       );
//       metadata = { pubkey: metaplexData.pubkey, data: json };
//     } catch (e) {
//       console.log("Failed to get metadata data", e);
//     }
//   }

//   try {
//     timeInvalidatorData = await timeInvalidator.accounts.getTimeInvalidator(
//       connection,
//       timeInvalidatorId
//     );
//   } catch (e) {
//     console.log("Failed to get time invalidator data", e);
//   }

//   try {
//     useInvalidatorData = await useInvalidator.accounts.getUseInvalidator(
//       connection,
//       useInvalidatorId
//     );
//   } catch (e) {
//     console.log("Failed to get use invalidator data", e);
//   }

//   try {
//     claimApproverData = await claimApprover.accounts.getClaimApprover(
//       connection,
//       tokenManagerId
//     );
//   } catch (e) {
//     console.log("Failed to get use invalidator data", e);
//   }

//   if (tokenManagerData?.parsed.recipientTokenAccount) {
//     try {
//       const mint = new spl.Token(
//         connection,
//         tokenManagerData?.parsed.mint,
//         spl.TOKEN_PROGRAM_ID,
//         // @ts-ignore
//         null
//       );
//       recipientTokenAccount = await mint.getAccountInfo(
//         tokenManagerData?.parsed.recipientTokenAccount
//       );
//     } catch (e) {
//       console.log("Failed to get recipient token account", e);
//     }
//   }

//   return {
//     metaplexData,
//     tokenManager: tokenManagerData,
//     claimApprover: claimApproverData,
//     useInvalidator: useInvalidatorData,
//     timeInvalidator: timeInvalidatorData,
//     metadata,
//     recipientTokenAccount,
//   };
// }
