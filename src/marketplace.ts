import {
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import type { Wallet } from "@saberhq/solana-contrib";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import type BN from "bn.js";

import { WSOL_MINT } from "./programs/listingAuthority";
import {
  getListing,
  getMarketplace,
  getMarketplaceByName,
} from "./programs/listingAuthority/accounts";
import {
  acceptListing,
  createListing,
  initListingAuthority,
  initMarketplace,
  removeListing,
  updateListing,
  updateListingAuthority,
  updateMarketplace,
} from "./programs/listingAuthority/instruction";
import {
  findListingAddress,
  findListingAuthorityAddress,
  findMarketplaceAddress,
} from "./programs/listingAuthority/pda";
import { getPaymentManager } from "./programs/paymentManager/accounts";
import { findPaymentManagerAddress } from "./programs/paymentManager/pda";
import {
  getRemainingAccountsForKind,
  TokenManagerKind,
  withRemainingAccountsForHandlePaymentWithRoyalties,
} from "./programs/tokenManager";
import {
  findTokenManagerAddress,
  findTransferReceiptId,
} from "./programs/tokenManager/pda";
import {
  findAta,
  tryGetAccount,
  withFindOrInitAssociatedTokenAccount,
} from "./utils";

export const withInitListingAuthority = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  authority: PublicKey,
  payer = wallet.publicKey,
  allowedMarketplaces?: PublicKey[]
): Promise<[Transaction, PublicKey]> => {
  const [listingAuthorityId] = await findListingAuthorityAddress(name);
  transaction.add(
    initListingAuthority(
      connection,
      wallet,
      name,
      listingAuthorityId,
      authority,
      payer,
      allowedMarketplaces
    )
  );
  return [transaction, listingAuthorityId];
};

export const withUpdateListingAuthority = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  authority: PublicKey,
  allowedMarketplaces: PublicKey[]
): Promise<Transaction> => {
  const [listingAuthorityId] = await findListingAuthorityAddress(name);
  transaction.add(
    updateListingAuthority(
      connection,
      wallet,
      listingAuthorityId,
      authority,
      allowedMarketplaces
    )
  );
  return transaction;
};

export const withInitMarketplace = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  listingAuthorityName: string,
  paymentManagerName: string,
  paymentMints?: PublicKey[],
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const [listingAuthorityId] = await findListingAuthorityAddress(
    listingAuthorityName
  );
  const [marketplaceId] = await findMarketplaceAddress(name);
  const [paymentManagerId] = await findPaymentManagerAddress(
    paymentManagerName
  );
  transaction.add(
    initMarketplace(
      connection,
      wallet,
      name,
      marketplaceId,
      listingAuthorityId,
      paymentManagerId,
      paymentMints,
      payer
    )
  );
  return [transaction, marketplaceId];
};

export const withUpdateMarketplace = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  listingAuthorityName: string,
  paymentManagerName: string,
  authority: PublicKey,
  paymentMints: PublicKey[]
): Promise<Transaction> => {
  const [listingAuthorityId] = await findListingAuthorityAddress(
    listingAuthorityName
  );
  const [marketplaceId] = await findMarketplaceAddress(name);
  const [paymentManagerId] = await findPaymentManagerAddress(
    paymentManagerName
  );
  transaction.add(
    updateMarketplace(
      connection,
      wallet,
      marketplaceId,
      listingAuthorityId,
      paymentManagerId,
      authority,
      paymentMints.length !== 0 ? paymentMints : undefined
    )
  );
  return transaction;
};

export const withCreateListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  markeptlaceName: string,
  paymentAmount: BN,
  paymentMint = WSOL_MINT,
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const [listingId] = await findListingAddress(mintId);
  const listerTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  const [marketplaceId] = await findMarketplaceAddress(markeptlaceName);
  const markeptlaceData = await tryGetAccount(() =>
    getMarketplaceByName(connection, markeptlaceName)
  );
  if (!markeptlaceData?.parsed) {
    throw `No marketplace with name ${markeptlaceName} found`;
  }

  transaction.add(
    createListing(
      connection,
      wallet,
      listingId,
      markeptlaceData.parsed.listingAuthority,
      marketplaceId,
      listerTokenAccountId,
      paymentAmount,
      paymentMint,
      payer
    )
  );
  return [transaction, marketplaceId];
};

export const withUpdateListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey
): Promise<Transaction> => {
  const [listingId] = await findListingAddress(mintId);
  const listingData = await tryGetAccount(() =>
    getListing(connection, listingId)
  );
  if (!listingData?.parsed) {
    throw `No listing found for mint address ${mintId.toString()}`;
  }

  transaction.add(
    updateListing(
      connection,
      wallet,
      listingId,
      listingData.parsed.marketplace,
      paymentAmount,
      paymentMint
    )
  );
  return transaction;
};

export const withRemoveListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
  const [listingId] = await findListingAddress(mintId);

  transaction.add(removeListing(connection, wallet, listingId));
  return transaction;
};

export const withAcceptListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  buyer: PublicKey,
  mintId: PublicKey
): Promise<Transaction> => {
  const listingData = await tryGetAccount(() => getListing(connection, mintId));
  if (!listingData?.parsed) {
    throw `No listing found with mint id ${mintId.toString()}`;
  }
  const marketplaceData = await tryGetAccount(() =>
    getMarketplace(connection, listingData.parsed.marketplace)
  );
  if (!marketplaceData?.parsed) {
    throw `No marketplace found with id ${mintId.toString()}`;
  }
  const paymentManagerData = await tryGetAccount(() =>
    getPaymentManager(connection, marketplaceData.parsed.paymentManager)
  );
  if (!paymentManagerData?.parsed) {
    throw `No payment manager found for marketplace with name ${marketplaceData.parsed.name}`;
  }

  const listerPaymentTokenAccountId =
    await withFindOrInitAssociatedTokenAccount(
      transaction,
      connection,
      listingData.parsed.paymentMint,
      listingData.parsed.lister,
      wallet.publicKey
    );

  const listerMintTokenAccountId = await findAta(
    mintId,
    listingData.parsed.lister,
    true
  );

  const buyerPaymentTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    listingData.parsed.paymentMint,
    buyer,
    wallet.publicKey
  );

  const buyerMintTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    buyer,
    wallet.publicKey
  );

  const feeCollectorTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    listingData.parsed.paymentMint,
    paymentManagerData?.parsed.feeCollector,
    wallet.publicKey
  );

  const mintMetadataId = await Metadata.getPDA(mintId);
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const [transferReceiptId] = await findTransferReceiptId(
    tokenManagerId,
    buyer
  );

  const remainingAccountsForHandlePaymentWithRoyalties =
    await withRemainingAccountsForHandlePaymentWithRoyalties(
      transaction,
      connection,
      wallet,
      mintId,
      listingData.parsed.paymentMint
    );

  let kind = TokenManagerKind.Edition;
  try {
    await MasterEdition.getPDA(mintId);
  } catch (e) {
    kind = TokenManagerKind.Managed;
  }
  const remainingAccountsForKind = await getRemainingAccountsForKind(
    mintId,
    kind
  );
  const remainingAccounts: AccountMeta[] = [
    ...remainingAccountsForHandlePaymentWithRoyalties,
    ...remainingAccountsForKind,
  ];

  transaction.add(
    acceptListing(
      connection,
      wallet,
      marketplaceData.parsed.listingAuthority,
      listerPaymentTokenAccountId,
      listerMintTokenAccountId,
      listingData.parsed.lister,
      buyerPaymentTokenAccountId,
      buyerMintTokenAccountId,
      buyer,
      marketplaceData.pubkey,
      mintId,
      listingData.pubkey,
      tokenManagerId,
      mintMetadataId,
      transferReceiptId,
      marketplaceData.parsed.paymentManager,
      listingData.parsed.paymentMint,
      feeCollectorTokenAccountId,
      remainingAccounts
    )
  );
  return transaction;
};
