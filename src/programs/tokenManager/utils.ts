import type { AccountData } from "@cardinal/common";
import {
  decodeIdlAccount,
  findMintEditionId,
  findMintMetadataId,
  METADATA_PROGRAM_ID,
  withFindOrInitAssociatedTokenAccount,
} from "@cardinal/common";
import {
  PREFIX as TOKEN_AUTH_RULESET_PREFIX,
  PROGRAM_ID as TOKEN_AUTH_RULES_ID,
} from "@metaplex-foundation/mpl-token-auth-rules";
import {
  Metadata,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { AccountMeta, Connection } from "@solana/web3.js";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import type { CardinalTokenManager } from "../../idl/cardinal_token_manager";
import type { TokenManagerData } from ".";
import {
  CRANK_KEY,
  InvalidationType,
  TOKEN_MANAGER_IDL,
  TokenManagerKind,
  TokenManagerState,
} from ".";
import {
  findMintManagerId,
  findTokenManagerAddress,
  findTransferReceiptId,
} from "./pda";

export const getRemainingAccountsForKind = (
  mintId: PublicKey,
  tokenManagerKind: TokenManagerKind
): AccountMeta[] => {
  if (
    tokenManagerKind === TokenManagerKind.Managed ||
    tokenManagerKind === TokenManagerKind.Permissioned
  ) {
    const mintManagerId = findMintManagerId(mintId);
    return [
      {
        pubkey: mintManagerId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (tokenManagerKind === TokenManagerKind.Edition) {
    const editionId = findMintEditionId(mintId);
    return [
      {
        pubkey: editionId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: METADATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
    ];
  } else {
    return [];
  }
};

/**
 * Convenience method to get remaining accounts for invalidation
 * NOTE: This ignores token account creation and assumes that is handled outside. Use withRemainingAccountsForInvalidate
 * to include token account creation in the current transaction
 * @param connection
 * @param mintId
 * @returns
 */
export const getRemainingAccountsForInvalidate = async (
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
) => {
  const tokenManagerId = findTokenManagerAddress(mintId);
  const [tokenManagerInfo, metadataInfo] =
    await connection.getMultipleAccountsInfo([
      tokenManagerId,
      findMintMetadataId(mintId),
    ]);
  if (!tokenManagerInfo) throw "Token manager not found";
  const tokenManagerData = decodeIdlAccount<
    "tokenManager",
    CardinalTokenManager
  >(tokenManagerInfo, "tokenManager", TOKEN_MANAGER_IDL);
  if (!metadataInfo) throw "Metadata not found";
  const metadata = Metadata.deserialize(metadataInfo.data)[0];

  const receipientTokenAccount = await getAccount(
    connection,
    tokenManagerData.parsed.recipientTokenAccount
  );

  return await withRemainingAccountsForInvalidate(
    new Transaction(),
    connection,
    wallet,
    mintId,
    { ...tokenManagerData, pubkey: tokenManagerId },
    receipientTokenAccount.owner,
    metadata
  );
};

export const withRemainingAccountsForInvalidate = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  tokenManagerData: AccountData<TokenManagerData>,
  recipientTokenAccountOwnerId: PublicKey,
  metadata: Metadata | null
): Promise<AccountMeta[]> => {
  const remainingAccounts: AccountMeta[] = [];
  if (tokenManagerData.parsed.state === TokenManagerState.Claimed) {
    if (
      tokenManagerData.parsed.kind === TokenManagerKind.Edition &&
      metadata?.tokenStandard === TokenStandard.ProgrammableNonFungible
    ) {
      remainingAccounts.push({
        pubkey: findMintMetadataId(mintId),
        isSigner: false,
        isWritable: false,
      });
    } else {
      remainingAccounts.push(
        ...getRemainingAccountsForKind(mintId, tokenManagerData.parsed.kind)
      );
    }
  }
  const returnAccounts = await withRemainingAccountsForReturn(
    transaction,
    connection,
    wallet,
    tokenManagerData,
    recipientTokenAccountOwnerId,
    metadata?.programmableConfig?.ruleSet ?? undefined
  );
  remainingAccounts.push(...returnAccounts);
  return remainingAccounts;
};

export const withRemainingAccountsForReturn = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  tokenManagerData: AccountData<TokenManagerData>,
  recipientTokenAccountOwnerId?: PublicKey,
  rulesetId?: PublicKey
): Promise<AccountMeta[]> => {
  const {
    issuer,
    mint,
    claimApprover,
    recipientTokenAccount,
    invalidationType,
    kind,
    receiptMint,
    state,
  } = tokenManagerData.parsed;
  if (
    invalidationType === InvalidationType.Vest &&
    state === TokenManagerState.Issued
  ) {
    if (!claimApprover) throw "Claim approver must be set";
    const claimApproverTokenAccountId =
      await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        mint,
        claimApprover,
        wallet.publicKey,
        true
      );
    return [
      {
        pubkey: claimApproverTokenAccountId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (
    invalidationType === InvalidationType.Return ||
    state === TokenManagerState.Issued
  ) {
    if (kind === TokenManagerKind.Programmable || rulesetId) {
      if (!rulesetId) throw "Ruleset not specified";
      if (!recipientTokenAccountOwnerId)
        throw "Recipient token account owner not specified";
      const remainingAccounts: AccountMeta[] = [];
      let returnTokenAccountId;
      if (receiptMint) {
        const receiptMintLargestAccount =
          await connection.getTokenLargestAccounts(receiptMint);

        // get holder of receipt mint
        const receiptTokenAccountId =
          receiptMintLargestAccount.value[0]?.address;
        if (!receiptTokenAccountId) throw new Error("No token accounts found");
        const receiptTokenAccount = await getAccount(
          connection,
          receiptTokenAccountId
        );

        // get ATA for this mint of receipt mint holder
        returnTokenAccountId = await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          mint,
          receiptTokenAccount.owner,
          wallet.publicKey,
          true
        );
        remainingAccounts.push(
          {
            pubkey: returnTokenAccountId,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: receiptTokenAccount.owner,
            isSigner: false,
            isWritable: false,
          },
          {
            pubkey: receiptTokenAccountId,
            isSigner: false,
            isWritable: true,
          }
        );
      } else {
        returnTokenAccountId = await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          mint,
          issuer,
          wallet.publicKey,
          true
        );
        remainingAccounts.push(
          {
            pubkey: returnTokenAccountId,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: issuer,
            isSigner: false,
            isWritable: false,
          }
        );
      }
      remainingAccounts.push(
        {
          pubkey: recipientTokenAccountOwnerId,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: wallet.publicKey,
          isSigner: true,
          isWritable: true,
        },
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
        {
          pubkey: findTokenRecordId(
            mint,
            getAssociatedTokenAddressSync(mint, tokenManagerData.pubkey, true)
          ),
          isSigner: false,
          isWritable: true,
        },
        ...remainingAccountForProgrammable(
          mint,
          recipientTokenAccount,
          returnTokenAccountId,
          rulesetId
        )
      );
      return remainingAccounts;
    } else {
      if (receiptMint) {
        const receiptMintLargestAccount =
          await connection.getTokenLargestAccounts(receiptMint);

        // get holder of receipt mint
        const receiptTokenAccountId =
          receiptMintLargestAccount.value[0]?.address;
        if (!receiptTokenAccountId) throw new Error("No token accounts found");
        const receiptTokenAccount = await getAccount(
          connection,
          receiptTokenAccountId
        );

        // get ATA for this mint of receipt mint holder
        const returnTokenAccountId = await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          mint,
          receiptTokenAccount.owner,
          wallet.publicKey,
          true
        );
        return [
          {
            pubkey: returnTokenAccountId,
            isSigner: false,
            isWritable: true,
          },
          {
            pubkey: receiptTokenAccountId,
            isSigner: false,
            isWritable: true,
          },
        ];
      } else {
        const issuerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          mint,
          issuer,
          wallet.publicKey,
          true
        );
        return [
          {
            pubkey: issuerTokenAccountId,
            isSigner: false,
            isWritable: true,
          },
        ];
      }
    }
  } else {
    return [];
  }
};

export const getRemainingAccountsForTransfer = (
  transferAuthority: PublicKey | null,
  tokenManagerId: PublicKey
): AccountMeta[] => {
  if (transferAuthority) {
    const transferReceiptId = findTransferReceiptId(tokenManagerId);
    return [
      {
        pubkey: transferReceiptId,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else {
    return [];
  }
};

export const remainingAccountForProgrammable = (
  mintId: PublicKey,
  fromTokenAccountId: PublicKey,
  toTokenAccountId: PublicKey,
  rulesetId: PublicKey
): AccountMeta[] => {
  return [
    {
      pubkey: mintId,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: findMintMetadataId(mintId),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: findMintEditionId(mintId),
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: findTokenRecordId(mintId, fromTokenAccountId),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: findTokenRecordId(mintId, toTokenAccountId),
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: SYSVAR_INSTRUCTIONS_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: TOKEN_AUTH_RULES_ID,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: rulesetId,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: METADATA_PROGRAM_ID,
      isSigner: false,
      isWritable: false,
    },
  ];
};

export const getRemainingAccountsForIssue = (
  tokenManagerKind: TokenManagerKind,
  mintId: PublicKey,
  issuerTokenAccountId: PublicKey,
  tokenManagerTokenAccountId: PublicKey,
  rulesetId?: PublicKey
): AccountMeta[] => {
  if (tokenManagerKind === TokenManagerKind.Permissioned) {
    return [
      {
        pubkey: CRANK_KEY,
        isSigner: false,
        isWritable: true,
      },
    ];
  } else if (tokenManagerKind === TokenManagerKind.Programmable) {
    if (!rulesetId) throw "Ruleset not specified";
    return remainingAccountForProgrammable(
      mintId,
      issuerTokenAccountId,
      tokenManagerTokenAccountId,
      rulesetId
    );
  } else {
    return [];
  }
};

export const getRemainingAccountsForClaim = (
  tokenManagerKind: TokenManagerKind,
  mintId: PublicKey,
  tokenManagerTokenAccountId: PublicKey,
  recipientTokenAccountId: PublicKey,
  rulesetId?: PublicKey,
  claimReceiptId?: PublicKey
): AccountMeta[] => {
  const remainingAccounts: AccountMeta[] = [];
  if (
    tokenManagerKind === TokenManagerKind.Managed ||
    tokenManagerKind === TokenManagerKind.Permissioned
  ) {
    const mintManagerId = findMintManagerId(mintId);
    remainingAccounts.push({
      pubkey: mintManagerId,
      isSigner: false,
      isWritable: true,
    });
  } else if (tokenManagerKind === TokenManagerKind.Edition) {
    const editionId = findMintEditionId(mintId);
    remainingAccounts.push(
      {
        pubkey: editionId,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: METADATA_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      }
    );
  } else if (tokenManagerKind === TokenManagerKind.Programmable) {
    if (!rulesetId) throw "Ruleset not specified";
    remainingAccounts.push(
      ...remainingAccountForProgrammable(
        mintId,
        tokenManagerTokenAccountId,
        recipientTokenAccountId,
        rulesetId
      )
    );
  }
  return claimReceiptId
    ? [
        ...remainingAccounts,
        { pubkey: claimReceiptId, isSigner: false, isWritable: true },
      ]
    : remainingAccounts;
};

export function findTokenRecordId(
  mint: PublicKey,
  token: PublicKey
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from("token_record"),
      token.toBuffer(),
    ],
    METADATA_PROGRAM_ID
  )[0];
}

export const findRuleSetId = (authority: PublicKey, name: string) => {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from(TOKEN_AUTH_RULESET_PREFIX),
      authority.toBuffer(),
      Buffer.from(name),
    ],
    TOKEN_AUTH_RULES_ID
  )[0];
};
