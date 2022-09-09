import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import type { BN } from "@project-serum/anchor";
import { AnchorProvider, Program } from "@project-serum/anchor";
import type { Wallet } from "@saberhq/solana-contrib";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import type {
  AccountMeta,
  Connection,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { SystemProgram } from "@solana/web3.js";

import { findAta } from "../../utils";
import { PAYMENT_MANAGER_ADDRESS } from "../paymentManager";
import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import {
  findTokenManagerAddress,
  findTransferReceiptId,
} from "../tokenManager/pda";
import * as constants from "./constants";
import {
  findListingAddress,
  findListingAuthorityAddress,
  findMarketplaceAddress,
} from "./pda";

export const initTransferAuthority = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  payer = wallet.publicKey,
  allowedMarketplaces?: PublicKey[]
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [listingAuthorityId] = await findListingAuthorityAddress(name);
  return [
    transferAuthorityProgram.instruction.initListingAuthority(
      {
        name: name,
        authority: wallet.publicKey,
        allowedMarketplaces: allowedMarketplaces || undefined,
      },
      {
        accounts: {
          listingAuthority: listingAuthorityId,
          payer: payer,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    listingAuthorityId,
  ];
};

export const updateTransferAuthority = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  authority: PublicKey,
  allowedMarketplaces: PublicKey[]
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [listingAuthorityId] = await findListingAuthorityAddress(name);
  return [
    transferAuthorityProgram.instruction.updateListingAuthority(
      {
        authority: wallet.publicKey,
        allowedMarketplaces: allowedMarketplaces,
      },
      {
        accounts: {
          listingAuthority: listingAuthorityId,
          authority: authority,
        },
      }
    ),
    listingAuthorityId,
  ];
};

export const initMarketplace = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  paymentManager: PublicKey,
  payer = wallet.publicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [marketplaceId] = await findMarketplaceAddress(name);
  return [
    transferAuthorityProgram.instruction.initMarketplace(
      {
        name: name,
        paymentManager: paymentManager,
        authority: provider.wallet.publicKey,
      },
      {
        accounts: {
          marketplace: marketplaceId,
          payer: payer,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    marketplaceId,
  ];
};

export const updateMarketplace = async (
  connection: Connection,
  wallet: Wallet,
  name: string,
  paymentManager: PublicKey,
  authority: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [marketplaceId] = await findMarketplaceAddress(name);
  return transferAuthorityProgram.instruction.updateMarketplace(
    {
      paymentManager: paymentManager,
      authority: authority,
    },
    {
      accounts: {
        marketplace: marketplaceId,
        authority: provider.wallet.publicKey,
      },
    }
  );
};

export const createListing = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  marketplaceId: PublicKey,
  listerTokenAccount: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey,
  payer = wallet.publicKey
): Promise<[TransactionInstruction, PublicKey]> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [listingId] = await findListingAddress(tokenManagerId);
  return [
    transferAuthorityProgram.instruction.createListing(
      {
        paymentAmount: paymentAmount,
        paymentMint: paymentMint,
      },
      {
        accounts: {
          listing: listingId,
          tokenManager: marketplaceId,
          marketplace: marketplaceId,
          listerTokenAccount: listerTokenAccount,
          lister: wallet.publicKey,
          payer: payer,
          systemProgram: SystemProgram.programId,
        },
      }
    ),
    listingId,
  ];
};

export const updateListing = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey,
  marketplaceId: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [listingId] = await findListingAddress(tokenManagerId);
  return transferAuthorityProgram.instruction.updateListing(
    {
      marketplace: marketplaceId,
      paymentAmount: paymentAmount,
      paymentMint: paymentMint,
    },
    {
      accounts: {
        listing: listingId,
        lister: wallet.publicKey,
      },
    }
  );
};

export const removeListing = async (
  connection: Connection,
  wallet: Wallet,
  tokenManagerId: PublicKey
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const [listingId] = await findListingAddress(tokenManagerId);
  return transferAuthorityProgram.instruction.removeListing({
    accounts: {
      listing: listingId,
      lister: wallet.publicKey,
    },
  });
};

export const acceptListing = async (
  connection: Connection,
  wallet: Wallet,
  listingAuthorityId: PublicKey,
  listerPaymentTokenAccountId: PublicKey,
  lister: PublicKey,
  buyerPaymentTokenAccountId: PublicKey,
  buyerMintTokenAccountId: PublicKey,
  buyer: PublicKey,
  marketplaceId: PublicKey,
  mintId: PublicKey,
  paymentManagerId: PublicKey,
  paymentMintId: PublicKey,
  feeCollectorTokenAccountId: PublicKey,
  remainingAccounts: AccountMeta[],
  payer = wallet.publicKey
): Promise<TransactionInstruction> => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  const mintMetadataId = await Metadata.getPDA(mintId);
  const [tokenManagerId] = await findTokenManagerAddress(mintId);
  const [listingId] = await findListingAddress(tokenManagerId);
  const [transferReceiptId] = await findTransferReceiptId(
    tokenManagerId,
    buyer
  );
  const listerMintTokenAccountId = await findAta(mintId, lister, true);
  return transferAuthorityProgram.instruction.acceptListing({
    accounts: {
      listingAuthority: listingAuthorityId,
      transferReceipt: transferReceiptId,
      listing: listingId,
      listerPaymentTokenAccount: listerPaymentTokenAccountId,
      listerMintTokenAccount: listerMintTokenAccountId,
      lister: lister,
      buyerPaymentTokenAccount: buyerPaymentTokenAccountId,
      buyerMintTokenAccount: buyerMintTokenAccountId,
      buyer: buyer,
      marketplace: marketplaceId,
      tokenManager: tokenManagerId,
      mint: mintId,
      mintMetadataInfo: mintMetadataId,
      paymentManager: paymentManagerId,
      paymentMint: paymentMintId,
      feeCollectorTokenAccount: feeCollectorTokenAccountId,
      payer: payer,
      tokenProgram: TOKEN_PROGRAM_ID,
      cardinalPaymentManager: PAYMENT_MANAGER_ADDRESS,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      systemProgram: SystemProgram.programId,
    },
    remainingAccounts: remainingAccounts,
  });
};
