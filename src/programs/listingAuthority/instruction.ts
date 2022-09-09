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

import { PAYMENT_MANAGER_ADDRESS } from "../paymentManager";
import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import * as constants from "./constants";

export const initListingAuthority = (
  connection: Connection,
  wallet: Wallet,
  name: string,
  listingAuthorityId: PublicKey,
  payer = wallet.publicKey,
  allowedMarketplaces?: PublicKey[]
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.initListingAuthority(
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
  );
};

export const updateListingAuthority = (
  connection: Connection,
  wallet: Wallet,
  listingAuthorityId: PublicKey,
  authority: PublicKey,
  allowedMarketplaces: PublicKey[]
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.updateListingAuthority(
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
  );
};

export const initMarketplace = (
  connection: Connection,
  wallet: Wallet,
  name: string,
  marketplaceId: PublicKey,
  listingAuthority: PublicKey,
  paymentManager: PublicKey,
  paymentMints: PublicKey[],
  payer = wallet.publicKey
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.initMarketplace(
    {
      name: name,
      paymentManager: paymentManager,
      authority: provider.wallet.publicKey,
      paymentMints: paymentMints,
      listingAuthority: listingAuthority,
    },
    {
      accounts: {
        marketplace: marketplaceId,
        payer: payer,
        systemProgram: SystemProgram.programId,
      },
    }
  );
};

export const updateMarketplace = (
  connection: Connection,
  wallet: Wallet,
  marketplace: PublicKey,
  listingAuthority: PublicKey,
  paymentManager: PublicKey,
  authority: PublicKey,
  paymentMints: PublicKey[]
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.updateMarketplace(
    {
      listingAuthority: listingAuthority,
      paymentManager: paymentManager,
      authority: authority,
      paymentMints: paymentMints,
    },
    {
      accounts: {
        marketplace: marketplace,
        authority: provider.wallet.publicKey,
      },
    }
  );
};

export const createListing = (
  connection: Connection,
  wallet: Wallet,
  listingId: PublicKey,
  listingAuthorityId: PublicKey,
  marketplaceId: PublicKey,
  listerTokenAccount: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey,
  payer = wallet.publicKey
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );
  return transferAuthorityProgram.instruction.createListing(
    {
      paymentAmount: paymentAmount,
      paymentMint: paymentMint,
    },
    {
      accounts: {
        listing: listingId,
        tokenManager: marketplaceId,
        listingAuthority: listingAuthorityId,
        marketplace: marketplaceId,
        listerTokenAccount: listerTokenAccount,
        lister: wallet.publicKey,
        payer: payer,
        systemProgram: SystemProgram.programId,
      },
    }
  );
};

export const updateListing = (
  connection: Connection,
  wallet: Wallet,
  listingId: PublicKey,
  marketplaceId: PublicKey,
  paymentAmount: BN,
  paymentMint: PublicKey
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

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

export const removeListing = (
  connection: Connection,
  wallet: Wallet,
  listingId: PublicKey
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.removeListing({
    accounts: {
      listing: listingId,
      lister: wallet.publicKey,
    },
  });
};

export const acceptListing = (
  connection: Connection,
  wallet: Wallet,
  listingAuthorityId: PublicKey,
  listerPaymentTokenAccountId: PublicKey,
  listerMintTokenAccountId: PublicKey,
  lister: PublicKey,
  buyerPaymentTokenAccountId: PublicKey,
  buyerMintTokenAccountId: PublicKey,
  buyer: PublicKey,
  marketplaceId: PublicKey,
  mintId: PublicKey,
  listingId: PublicKey,
  tokenManagerId: PublicKey,
  mintMetadataId: PublicKey,
  transferReceiptId: PublicKey,
  paymentManagerId: PublicKey,
  paymentMintId: PublicKey,
  feeCollectorTokenAccountId: PublicKey,
  remainingAccounts: AccountMeta[],
  payer = wallet.publicKey
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

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
