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
  acceptTransfer,
  cancelTransfer,
  createListing,
  initMarketplace,
  initTransfer,
  inittransferAuthority,
  release,
  removeListing,
  updateListing,
  updateMarketplace,
  updatetransferAuthority,
  whitelistMarkeplaces,
} from "./programs/listingAuthority/instruction";
import {
  findListingAddress,
  findMarketplaceAddress,
  findTransferAddress,
  findTransferAuthorityAddress,
} from "./programs/listingAuthority/pda";
import { getPaymentManager } from "./programs/paymentManager/accounts";
import { findPaymentManagerAddress } from "./programs/paymentManager/pda";
import {
  getRemainingAccountsForKind,
  InvalidationType,
  TokenManagerKind,
  withRemainingAccountsForHandlePaymentWithRoyalties,
  withRemainingAccountsForReturn,
} from "./programs/tokenManager";
import { getTokenManager } from "./programs/tokenManager/accounts";
import { claim } from "./programs/tokenManager/instruction";
import {
  findTokenManagerAddress,
  findTransferReceiptId,
} from "./programs/tokenManager/pda";
import { withIssueToken } from "./transaction";
import {
  emptyWallet,
  findAta,
  tryGetAccount,
  withFindOrInitAssociatedTokenAccount,
} from "./utils";
import { withWrapSol } from "./wrappedSol";

export const withWrapToken = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  transferAuthorityName?: string,
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const checkTokenManager = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (checkTokenManager?.parsed) {
    throw "Token is already wrapped";
  }
  const issuerTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  let kind = TokenManagerKind.Edition;
  try {
    await MasterEdition.getPDA(mintId);
  } catch (e) {
    kind = TokenManagerKind.Managed;
  }

  await withIssueToken(
    transaction,
    connection,
    wallet,
    {
      mint: mintId,
      invalidationType: InvalidationType.Release,
      issuerTokenAccountId: issuerTokenAccountId,
      kind: kind,
      transferAuthorityName: transferAuthorityName,
    },
    payer
  );

  const tokenManagerTokenAccountId = await findAta(
    mintId,
    tokenManagerId,
    true
  );
  const recipientTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    wallet.publicKey,
    payer,
    true
  );

  transaction.add(
    await claim(
      connection,
      wallet,
      tokenManagerId,
      kind,
      mintId,
      tokenManagerTokenAccountId,
      recipientTokenAccountId,
      undefined
    )
  );

  return [transaction, tokenManagerId];
};

export const withInitTransferAuthority = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  authority = wallet.publicKey,
  payer = wallet.publicKey,
  allowedMarketplaces?: PublicKey[]
): Promise<[Transaction, PublicKey]> => {
  const [transferAuthority] = await findTransferAuthorityAddress(name);
  transaction.add(
    inittransferAuthority(
      connection,
      wallet,
      name,
      transferAuthority,
      authority,
      payer,
      allowedMarketplaces
    )
  );
  return [transaction, transferAuthority];
};

export const withUpdateTransferAuthority = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  authority: PublicKey,
  allowedMarketplaces: PublicKey[]
): Promise<Transaction> => {
  const [transferAuthority] = await findTransferAuthorityAddress(name);
  transaction.add(
    updatetransferAuthority(
      connection,
      wallet,
      transferAuthority,
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
  transferAuthorityName: string,
  paymentManagerName: string,
  paymentMints?: PublicKey[],
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const [transferAuthority] = await findTransferAuthorityAddress(
    transferAuthorityName
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
      transferAuthority,
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
  transferAuthorityName: string,
  paymentManagerName: string,
  authority: PublicKey,
  paymentMints: PublicKey[]
): Promise<Transaction> => {
  const [transferAuthority] = await findTransferAuthorityAddress(
    transferAuthorityName
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
      transferAuthority,
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
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
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
      markeptlaceData.parsed.transferAuthority,
      tokenManagerId,
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

  if (listingData.parsed.paymentMint.toString() === WSOL_MINT.toString()) {
    await withWrapSol(
      transaction,
      connection,
      emptyWallet(buyer),
      listingData.parsed.paymentAmount.toNumber(),
      true
    );
  }

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
  const [transferId] = await findTransferAddress(mintId);

  const remainingAccountsForHandlePaymentWithRoyalties =
    await withRemainingAccountsForHandlePaymentWithRoyalties(
      transaction,
      connection,
      wallet,
      mintId,
      listingData.parsed.paymentMint,
      [listingData.parsed.lister.toString()]
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
      marketplaceData.parsed.transferAuthority,
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
      transferId,
      marketplaceData.parsed.paymentManager,
      listingData.parsed.paymentMint,
      feeCollectorTokenAccountId,
      remainingAccounts
    )
  );
  return transaction;
};

export const withWhitelistMarektplaces = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  transferAuthorityName: string,
  marketplaceNames: string[]
): Promise<Transaction> => {
  const [transferAuthority] = await findTransferAuthorityAddress(
    transferAuthorityName
  );

  const marketplaceIds = (
    await Promise.all(
      marketplaceNames.map((name) => findMarketplaceAddress(name))
    )
  ).map((el) => el[0]);
  transaction.add(
    whitelistMarkeplaces(connection, wallet, transferAuthority, marketplaceIds)
  );
  return transaction;
};

export const withInitTransfer = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  to: PublicKey,
  mintId: PublicKey,
  payer = wallet.publicKey
): Promise<Transaction> => {
  const [transferId] = await findTransferAddress(mintId);
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  let holderTokenAccountId: PublicKey;
  try {
    holderTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  } catch (e) {
    throw `Wallet is not the holder of mint ${mintId.toString()}`;
  }
  transaction.add(
    initTransfer(connection, wallet, {
      to: to,
      transferId: transferId,
      tokenManagerId: tokenManagerId,
      holderTokenAccountId: holderTokenAccountId,
      holder: wallet.publicKey,
      payer: payer,
    })
  );
  return transaction;
};

export const withCancelTransfer = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
  const [transferId] = await findTransferAddress(mintId);
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  let holderTokenAccountId: PublicKey;
  try {
    holderTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  } catch (e) {
    throw `Wallet is not the holder of mint ${mintId.toString()}`;
  }
  transaction.add(
    cancelTransfer(connection, wallet, {
      transferId: transferId,
      tokenManagerId: tokenManagerId,
      holderTokenAccountId: holderTokenAccountId,
      holder: wallet.publicKey,
    })
  );
  return transaction;
};

export const withAcceptTransfer = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  recipient: PublicKey,
  holder: PublicKey
): Promise<Transaction> => {
  const [transferId] = await findTransferAddress(mintId);
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  let holderTokenAccountId: PublicKey;
  try {
    holderTokenAccountId = await findAta(mintId, holder, true);
  } catch (e) {
    throw `Holder is not the owner of mint ${mintId.toString()}`;
  }
  const recipientTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    recipient,
    wallet.publicKey,
    true
  );
  const [transferReceiptId] = await findTransferReceiptId(
    tokenManagerId,
    recipient
  );
  const [listingId] = await findListingAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData) {
    throw `No token manager found for mint ${mintId.toString()}`;
  }
  if (!tokenManagerData.parsed.transferAuthority) {
    throw `No transfer autority found for mint id ${mintId.toString()}`;
  }
  let kind = TokenManagerKind.Edition;
  try {
    await MasterEdition.getPDA(mintId);
  } catch (e) {
    kind = TokenManagerKind.Managed;
  }
  const remainingAccountsForTransfer = [
    ...(await getRemainingAccountsForKind(mintId, kind)),
    {
      pubkey: transferReceiptId,
      isSigner: false,
      isWritable: true,
    },
  ];
  transaction.add(
    acceptTransfer(connection, wallet, {
      transferId: transferId,
      tokenManagerId: tokenManagerId,
      holderTokenAccountId: holderTokenAccountId,
      holder: holder,
      recipient: recipient,
      recipientTokenAccountId: recipientTokenAccountId,
      mintId: mintId,
      transferReceiptId: transferReceiptId,
      listingId: listingId,
      transferAuthorityId: tokenManagerData.parsed.transferAuthority,
      remainingAccounts: remainingAccountsForTransfer,
    })
  );
  return transaction;
};

export const withRelease = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  transferAuthorityId: PublicKey,
  payer = wallet.publicKey
): Promise<Transaction> => {
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  let holderTokenAccountId: PublicKey;
  try {
    holderTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  } catch (e) {
    throw `Wallet is not the holder of mint ${mintId.toString()}`;
  }
  const tokenManagerTokenAccount = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    tokenManagerId,
    payer,
    true
  );
  const tokenManagerData = await getTokenManager(connection, tokenManagerId);
  const remainingAccountsForKind = await getRemainingAccountsForKind(
    mintId,
    tokenManagerData.parsed.kind
  );
  const remainingAccountsForReturn = await withRemainingAccountsForReturn(
    transaction,
    connection,
    wallet,
    tokenManagerData
  );
  transaction.add(
    release(connection, wallet, {
      transferAuthorityId: transferAuthorityId,
      tokenManagerId: tokenManagerId,
      mintId: mintId,
      tokenManagerTokenAccountId: tokenManagerTokenAccount,
      holderTokenAccountId: holderTokenAccountId,
      holder: wallet.publicKey,
      remainingAccounts: [
        ...remainingAccountsForKind,
        ...remainingAccountsForReturn,
      ],
    })
  );
  return transaction;
};
