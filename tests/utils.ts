import {
  executeTransaction,
  findMintEditionId,
  findMintMetadataId,
} from "@cardinal/common";
import {
  createCreateOrUpdateInstruction,
  PROGRAM_ID as TOKEN_AUTH_RULES_ID,
} from "@metaplex-foundation/mpl-token-auth-rules";
import { encode } from "@msgpack/msgpack";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { Connection, PublicKey } from "@solana/web3.js";
import {
  Keypair,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import {
  createCreateInstruction,
  createMintInstruction,
  TokenStandard,
} from "mplx-beta";

import { findRuleSetId, findTokenRecordId } from "../src/programs/tokenManager";

export const createProgrammableAsset = async (
  connection: Connection,
  wallet: Wallet
): Promise<[PublicKey, PublicKey, PublicKey]> => {
  const mintKeypair = Keypair.generate();
  const mintId = mintKeypair.publicKey;
  const [tx, ata, rulesetId] = createProgrammableAssetTx(
    mintKeypair.publicKey,
    wallet.publicKey
  );
  await executeTransaction(connection, tx, wallet, { signers: [mintKeypair] });
  return [ata, mintId, rulesetId];
};

export const createProgrammableAssetTx = (
  mintId: PublicKey,
  authority: PublicKey
): [Transaction, PublicKey, PublicKey] => {
  const metadataId = findMintMetadataId(mintId);
  const masterEditionId = findMintEditionId(mintId);
  const ataId = getAssociatedTokenAddressSync(mintId, authority);
  const rulesetName = `rs-${Math.floor(Date.now() / 1000)}`;
  const rulesetId = findRuleSetId(authority, rulesetName);
  const rulesetIx = createCreateOrUpdateInstruction(
    {
      payer: authority,
      ruleSetPda: rulesetId,
    },
    {
      createOrUpdateArgs: {
        __kind: "V1",
        serializedRuleSet: encode([
          1,
          authority.toBuffer().reduce((acc, i) => {
            acc.push(i);
            return acc;
          }, [] as number[]),
          rulesetName,
          {
            "Transfer:WalletToWallet": "Pass",
            "Transfer:Owner": "Pass",
            "Transfer:Delegate": "Pass",
            "Transfer:TransferDelegate": "Pass",
            "Delegate:LockedTransfer": "Pass",
          },
        ]),
      },
    }
  );
  const createIx = createCreateInstruction(
    {
      metadata: metadataId,
      masterEdition: masterEditionId,
      mint: mintId,
      authority: authority,
      payer: authority,
      splTokenProgram: TOKEN_PROGRAM_ID,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      updateAuthority: authority,
    },
    {
      createArgs: {
        __kind: "V1",
        assetData: {
          name: `NFT - ${Math.floor(Date.now() / 1000)}`,
          symbol: "PNF",
          uri: "uri",
          sellerFeeBasisPoints: 0,
          creators: [
            {
              address: authority,
              share: 100,
              verified: false,
            },
          ],
          primarySaleHappened: false,
          isMutable: true,
          tokenStandard: TokenStandard.ProgrammableNonFungible,
          collection: null,
          uses: null,
          collectionDetails: null,
          ruleSet: rulesetId,
        },
        decimals: 0,
        printSupply: { __kind: "Zero" },
      },
    }
  );
  const createIxWithSigner = {
    ...createIx,
    keys: createIx.keys.map((k) =>
      k.pubkey.toString() === mintId.toString() ? { ...k, isSigner: true } : k
    ),
  };
  const mintIx = createMintInstruction(
    {
      token: ataId,
      tokenOwner: authority,
      metadata: metadataId,
      masterEdition: masterEditionId,
      tokenRecord: findTokenRecordId(mintId, ataId),
      mint: mintId,
      payer: authority,
      authority: authority,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      splAtaProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      splTokenProgram: TOKEN_PROGRAM_ID,
      authorizationRules: rulesetId,
      authorizationRulesProgram: TOKEN_AUTH_RULES_ID,
    },
    {
      mintArgs: {
        __kind: "V1",
        amount: 1,
        authorizationData: null,
      },
    }
  );
  return [
    new Transaction().add(rulesetIx, createIxWithSigner, mintIx),
    ataId,
    rulesetId,
  ];
};
