import {
  emptyWallet,
  findAta,
  findMintEditionId,
  findMintMetadataId,
  tryGetAccount,
  withFindOrInitAssociatedTokenAccount,
  withWrapSol,
} from "@cardinal/common";
import { PAYMENT_MANAGER_ADDRESS } from "@cardinal/payment-manager";
import { getPaymentManager } from "@cardinal/payment-manager/dist/cjs/accounts";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { withRemainingAccountsForHandlePaymentWithRoyalties } from "@cardinal/payment-manager/dist/cjs/utils";
import type { Wallet } from "@project-serum/anchor/dist/cjs/provider";
import { ASSOCIATED_PROGRAM_ID } from "@project-serum/anchor/dist/cjs/utils/token";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { AccountMeta, Connection, Transaction } from "@solana/web3.js";
import {
  PublicKey,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import type BN from "bn.js";

import {
  getRemainingAccountsForKind,
  InvalidationType,
  TOKEN_MANAGER_ADDRESS,
  TokenManagerKind,
  tokenManagerProgram,
  withRemainingAccountsForReturn,
} from "./programs/tokenManager";
import { getTokenManager } from "./programs/tokenManager/accounts";
import {
  findMintManagerId,
  findTokenManagerAddress,
  findTransferReceiptId,
} from "./programs/tokenManager/pda";
import {
  transferAuthorityProgram,
  WSOL_MINT,
} from "./programs/transferAuthority";
import {
  getListing,
  getMarketplace,
} from "./programs/transferAuthority/accounts";
import {
  findListingAddress,
  findMarketplaceAddress,
  findTransferAddress,
  findTransferAuthorityAddress,
} from "./programs/transferAuthority/pda";
import { withIssueToken } from "./transaction";

export const withWrapToken = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  transferAuthorityInfo?: {
    transferAuthorityName: string;
    creator?: PublicKey;
  },
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const tmManagerProgram = tokenManagerProgram(connection, wallet);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const checkTokenManager = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (checkTokenManager?.parsed) {
    throw "Token is already wrapped";
  }
  const issuerTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  let kind = TokenManagerKind.Edition;
  const masterEditionId = findMintEditionId(mintId);
  const accountInfo = await connection.getAccountInfo(masterEditionId);
  if (!accountInfo) kind = TokenManagerKind.Permissioned;

  await withIssueToken(
    transaction,
    connection,
    wallet,
    {
      mint: mintId,
      invalidationType: InvalidationType.Release,
      issuerTokenAccountId: issuerTokenAccountId,
      kind: kind,
      transferAuthorityInfo: transferAuthorityInfo
        ? {
            transferAuthorityName: transferAuthorityInfo.transferAuthorityName,
            creator: transferAuthorityInfo.creator,
          }
        : undefined,
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

  const remainingAccounts = getRemainingAccountsForKind(mintId, kind);
  const claimIx = await tmManagerProgram.methods
    .claim()
    .accounts({
      tokenManager: tokenManagerId,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      mint: mintId,
      recipient: wallet.publicKey,
      recipientTokenAccount: recipientTokenAccountId,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
  transaction.add(claimIx);

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
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const transferAuthorityId = findTransferAuthorityAddress(name);

  const initTransferAuthorityIx = await transferAuthProgram.methods
    .initTransferAuthority({
      name: name,
      authority: authority,
      allowedMarketplaces: allowedMarketplaces ?? null,
    })
    .accounts({
      transferAuthority: transferAuthorityId,
      payer: payer ?? wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  transaction.add(initTransferAuthorityIx);
  return [transaction, transferAuthorityId];
};

export const withUpdateTransferAuthority = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  authority: PublicKey,
  allowedMarketplaces?: PublicKey[]
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const transferAuthorityId = findTransferAuthorityAddress(name);

  const updateTransferAuthorityIx = await transferAuthProgram.methods
    .updateTransferAuthority({
      authority: authority,
      allowedMarketplaces: allowedMarketplaces,
    })
    .accounts({
      transferAuthority: transferAuthorityId,
      authority: authority,
    })
    .instruction();
  transaction.add(updateTransferAuthorityIx);
  return transaction;
};

export const withInitMarketplace = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  paymentManagerName: string,
  paymentMints?: PublicKey[],
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const marketplaceId = findMarketplaceAddress(name);
  const paymentManagerId = findPaymentManagerAddress(paymentManagerName);

  const initMarketplaceIx = await transferAuthProgram.methods
    .initMarketplace({
      name: name,
      authority: wallet.publicKey,
      paymentMints: paymentMints ?? null,
    })
    .accounts({
      marketplace: marketplaceId,
      paymentManager: paymentManagerId,
      payer: payer ?? wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  transaction.add(initMarketplaceIx);
  return [transaction, marketplaceId];
};

export const withUpdateMarketplace = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  name: string,
  paymentManagerName: string,
  authority: PublicKey,
  paymentMints: PublicKey[]
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const marketplaceId = findMarketplaceAddress(name);
  const paymentManagerId = findPaymentManagerAddress(paymentManagerName);

  const updateMarketplaceIx = await transferAuthProgram.methods
    .updateMarketplace({
      paymentManager: paymentManagerId,
      authority: authority,
      paymentMints: paymentMints,
    })
    .accounts({
      marketplace: marketplaceId,
      authority: authority,
    })
    .instruction();
  transaction.add(updateMarketplaceIx);
  return transaction;
};

export const withCreateListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  markeptlaceName: string,
  paymentAmount: BN,
  paymentMint = PublicKey.default,
  payer = wallet.publicKey
): Promise<[Transaction, PublicKey]> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const listingId = findListingAddress(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const listerTokenAccountId = await findAta(mintId, wallet.publicKey, true);
  const marketplaceId = findMarketplaceAddress(markeptlaceName);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData?.parsed) {
    throw `No tokenManagerData for mint id${mintId.toString()} found`;
  }
  if (!tokenManagerData.parsed.transferAuthority) {
    throw `No transfer authority for token manager`;
  }
  const checkListing = await tryGetAccount(() =>
    getListing(connection, listingId)
  );
  if (checkListing) {
    transaction.add(
      await withUpdateListing(
        transaction,
        connection,
        wallet,
        mintId,
        marketplaceId,
        paymentAmount,
        paymentMint
      )
    );
  } else {
    const mintManagerId = findMintManagerId(mintId);
    const createListingIx = await transferAuthProgram.methods
      .createListing({
        paymentAmount: paymentAmount,
        paymentMint: paymentMint,
      })
      .accounts({
        listing: listingId,
        transferAuthority: tokenManagerData.parsed.transferAuthority,
        marketplace: marketplaceId,
        tokenManager: tokenManagerId,
        mint: mintId,
        mintManager: mintManagerId,
        listerTokenAccount: listerTokenAccountId,
        lister: wallet.publicKey,
        payer: payer ?? wallet.publicKey,
        cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      })
      .instruction();
    transaction.add(createListingIx);
  }

  return [transaction, marketplaceId];
};

export const withUpdateListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  marketplaceId: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const listingData = await tryGetAccount(() => getListing(connection, mintId));
  if (!listingData?.parsed) {
    throw `No listing found for mint address ${mintId.toString()}`;
  }
  const listerMintTokenAccountId = await findAta(
    mintId,
    wallet.publicKey,
    true
  );

  const listingId = findListingAddress(mintId);
  const updateListingIx = await transferAuthProgram.methods
    .updateListing({
      marketplace: marketplaceId,
      paymentAmount: paymentAmount,
      paymentMint: paymentMint,
    })
    .accounts({
      tokenManager: listingData.parsed.tokenManager,
      listing: listingId,
      listerMintTokenAccount: listerMintTokenAccountId,
      lister: wallet.publicKey,
    })
    .instruction();
  transaction.add(updateListingIx);
  return transaction;
};

export const withRemoveListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  listerMintTokenAccountId: PublicKey
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const listingId = findListingAddress(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const mintManagerId = findMintManagerId(mintId);

  const removeListingIx = await transferAuthProgram.methods
    .removeListing()
    .accounts({
      tokenManager: tokenManagerId,
      listing: listingId,
      listerMintTokenAccount: listerMintTokenAccountId,
      lister: wallet.publicKey,
      mint: mintId,
      mintManager: mintManagerId,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
  transaction.add(removeListingIx);
  return transaction;
};

export const withAcceptListing = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  buyer: PublicKey,
  mintId: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey,
  buySideReceiver?: PublicKey,
  payer = buyer
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
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
  const nativePayment = paymentMint.toString() === PublicKey.default.toString();

  const listerPaymentTokenAccountId = nativePayment
    ? listingData.parsed.lister
    : await withFindOrInitAssociatedTokenAccount(
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

  const payerPaymentTokenAccountId = nativePayment
    ? payer
    : listingData.parsed.lister.toString() !== payer.toString()
    ? await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        listingData.parsed.paymentMint,
        payer,
        wallet.publicKey
      )
    : listerPaymentTokenAccountId;

  if (listingData.parsed.paymentMint.toString() === WSOL_MINT.toString()) {
    await withWrapSol(
      transaction,
      connection,
      emptyWallet(buyer),
      listingData.parsed.paymentAmount.toNumber(),
      true
    );
  }

  const buyerMintTokenAccountId =
    listingData.parsed.lister.toString() === buyer.toString()
      ? await findAta(mintId, buyer, true)
      : await withFindOrInitAssociatedTokenAccount(
          transaction,
          connection,
          mintId,
          buyer,
          wallet.publicKey,
          true
        );

  const feeCollectorTokenAccountId = nativePayment
    ? paymentManagerData?.parsed.feeCollector
    : await withFindOrInitAssociatedTokenAccount(
        transaction,
        connection,
        listingData.parsed.paymentMint,
        paymentManagerData?.parsed.feeCollector,
        wallet.publicKey,
        true
      );

  const mintMetadataId = findMintMetadataId(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const transferReceiptId = findTransferReceiptId(tokenManagerId);

  const remainingAccountsForHandlePaymentWithRoyalties =
    await withRemainingAccountsForHandlePaymentWithRoyalties(
      transaction,
      connection,
      wallet,
      mintId,
      listingData.parsed.paymentMint,
      buySideReceiver,
      [listingData.parsed.lister.toString(), buyer.toString()]
    );

  const tokenManagerData = await getTokenManager(connection, tokenManagerId);
  if (!tokenManagerData) {
    throw `No token manager found for ${mintId.toString()}`;
  }
  if (!tokenManagerData.parsed.transferAuthority) {
    throw `No transfer authority for token manager`;
  }
  const remainingAccountsForKind = getRemainingAccountsForKind(
    mintId,
    tokenManagerData.parsed.kind
  );
  const remainingAccounts: AccountMeta[] = [
    ...remainingAccountsForHandlePaymentWithRoyalties,
    ...remainingAccountsForKind,
  ];

  if (
    (paymentAmount && !paymentAmount.eq(listingData.parsed.paymentAmount)) ||
    (paymentMint && !paymentMint.equals(listingData.parsed.paymentMint))
  ) {
    throw "Listing data does not match expected values";
  }

  const acceptListingIx = await transferAuthProgram.methods
    .acceptListing({
      paymentAmount: paymentAmount,
    })
    .accounts({
      transferAuthority: tokenManagerData.parsed.transferAuthority,
      transferReceipt: transferReceiptId,
      listing: listingData.pubkey,
      listerPaymentTokenAccount: listerPaymentTokenAccountId,
      listerMintTokenAccount: listerMintTokenAccountId,
      lister: listingData.parsed.lister,
      buyerMintTokenAccount: buyerMintTokenAccountId,
      buyer: buyer,
      payer: payer ?? buyer,
      payerPaymentTokenAccount: payerPaymentTokenAccountId,
      marketplace: marketplaceData.pubkey,
      tokenManager: tokenManagerData.pubkey,
      mint: tokenManagerData.parsed.mint,
      mintMetadataInfo: mintMetadataId,
      paymentManager: marketplaceData.parsed.paymentManager,
      paymentMint: paymentMint,
      feeCollectorTokenAccount: feeCollectorTokenAccountId,
      feeCollector: paymentManagerData.parsed.feeCollector,
      cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      associatedTokenProgram: ASSOCIATED_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
  transaction.add(acceptListingIx);

  return transaction;
};

export const withWhitelistMarektplaces = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  transferAuthorityName: string,
  marketplaceNames: string[]
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const transferAuthority = findTransferAuthorityAddress(transferAuthorityName);

  const marketplaceIds = marketplaceNames.map((name) =>
    findMarketplaceAddress(name)
  );

  const whitelistMarketplaceIx = await transferAuthProgram.methods
    .whitelistMarketplaces({
      allowedMarketplaces: marketplaceIds,
    })
    .accounts({
      transferAuthority: transferAuthority,
      authority: wallet.publicKey,
    })
    .instruction();
  transaction.add(whitelistMarketplaceIx);
  return transaction;
};

export const withInitTransfer = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  to: PublicKey,
  mintId: PublicKey,
  holderTokenAccountId: PublicKey,
  payer = wallet.publicKey
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const transferId = findTransferAddress(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);

  const initTransferIx = await transferAuthProgram.methods
    .initTransfer({
      to: to,
    })
    .accounts({
      transfer: transferId,
      tokenManager: tokenManagerId,
      holderTokenAccount: holderTokenAccountId,
      holder: wallet.publicKey,
      payer: payer ?? wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  transaction.add(initTransferIx);
  return transaction;
};

export const withCancelTransfer = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const transferId = findTransferAddress(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const checkTokenManager = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!checkTokenManager) {
    throw `No token manager found for mint id ${mintId.toString()}`;
  }

  const cancelTransferIx = await transferAuthProgram.methods
    .cancelTransfer()
    .accounts({
      transfer: transferId,
      tokenManager: tokenManagerId,
      holderTokenAccount: checkTokenManager.parsed.recipientTokenAccount,
      holder: wallet.publicKey,
    })
    .instruction();
  transaction.add(cancelTransferIx);
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
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const transferId = findTransferAddress(mintId);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const transferReceiptId = findTransferReceiptId(tokenManagerId);
  const listingId = findListingAddress(mintId);
  const tokenManagerData = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!tokenManagerData) {
    throw `No token manager found for mint ${mintId.toString()}`;
  }
  if (!tokenManagerData.parsed.transferAuthority) {
    throw `No transfer autority found for mint id ${mintId.toString()}`;
  }
  const recipientTokenAccountId = await findAta(mintId, recipient, true);
  const remainingAccountsForTransfer = [
    ...getRemainingAccountsForKind(mintId, tokenManagerData.parsed.kind),
    {
      pubkey: transferReceiptId,
      isSigner: false,
      isWritable: true,
    },
  ];

  const accceptTransferIx = await transferAuthProgram.methods
    .acceptTransfer()
    .accounts({
      transfer: transferId,
      transferAuthority: tokenManagerData.parsed.transferAuthority,
      transferReceipt: transferReceiptId,
      listing: listingId,
      tokenManager: tokenManagerId,
      mint: mintId,
      recipientTokenAccount: recipientTokenAccountId,
      recipient: recipient,
      payer: wallet.publicKey,
      holderTokenAccount: tokenManagerData.parsed.recipientTokenAccount,
      holder: holder,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    })
    .remainingAccounts(remainingAccountsForTransfer)
    .instruction();
  transaction.add(accceptTransferIx);
  return transaction;
};

export const withRelease = async (
  transaction: Transaction,
  connection: Connection,
  wallet: Wallet,
  mintId: PublicKey,
  transferAuthorityId: PublicKey,
  holderTokenAccountId: PublicKey,
  payer = wallet.publicKey
): Promise<Transaction> => {
  const transferAuthProgram = transferAuthorityProgram(connection, wallet);
  const tokenManagerId = findTokenManagerAddress(mintId);
  const checkTokenManager = await tryGetAccount(() =>
    getTokenManager(connection, tokenManagerId)
  );
  if (!checkTokenManager) {
    throw `No token manager found for mint id ${mintId.toString()}`;
  }
  const tokenManagerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
    transaction,
    connection,
    mintId,
    tokenManagerId,
    payer,
    true
  );
  const tokenManagerData = await getTokenManager(connection, tokenManagerId);
  const remainingAccountsForKind = getRemainingAccountsForKind(
    mintId,
    tokenManagerData.parsed.kind
  );
  const remainingAccountsForReturn = await withRemainingAccountsForReturn(
    transaction,
    connection,
    wallet,
    tokenManagerData
  );

  const releaseIx = await transferAuthProgram.methods
    .release()
    .accounts({
      transferAuthority: transferAuthorityId,
      tokenManager: tokenManagerId,
      mint: mintId,
      tokenManagerTokenAccount: tokenManagerTokenAccountId,
      holderTokenAccount: holderTokenAccountId,
      holder: wallet.publicKey,
      collector: wallet.publicKey,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .remainingAccounts([
      ...remainingAccountsForKind,
      ...remainingAccountsForReturn,
    ])
    .instruction();
  transaction.add(releaseIx);
  return transaction;
};
