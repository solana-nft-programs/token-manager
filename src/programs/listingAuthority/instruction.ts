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
import { SystemProgram, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";

import { PAYMENT_MANAGER_ADDRESS } from "../paymentManager";
import { TOKEN_MANAGER_ADDRESS } from "../tokenManager";
import * as constants from "./constants";

export const initListingAuthority = (
  connection: Connection,
  wallet: Wallet,
  name: string,
  listingAuthorityId: PublicKey,
  authorityId: PublicKey,
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
      authority: authorityId,
      allowedMarketplaces: allowedMarketplaces || null,
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
  paymentMints: PublicKey[] | undefined,
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
      paymentMints: paymentMints || null,
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
  paymentMints: PublicKey[] | undefined
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
  tokenManagerId: PublicKey,
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
        tokenManager: tokenManagerId,
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

export const whitelistMarkeplaces = (
  connection: Connection,
  wallet: Wallet,
  listingAuthorityId: PublicKey,
  whitelistMarketplaces: PublicKey[]
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.whitelistMarketplaces(
    { allowedMarketplaces: whitelistMarketplaces },
    {
      accounts: {
        listingAuthority: listingAuthorityId,
        authority: wallet.publicKey,
      },
    }
  );
};

export const initTransfer = (
  connection: Connection,
  wallet: Wallet,
  params: {
    to: PublicKey;
    transferId: PublicKey;
    tokenManagerId: PublicKey;
    holderTokenAccountId: PublicKey;
    holder: PublicKey;
    payer?: PublicKey;
  }
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );
  return transferAuthorityProgram.instruction.initTransfer(
    { to: params.to },
    {
      accounts: {
        transfer: params.transferId,
        tokenManager: params.tokenManagerId,
        holderTokenAccount: params.holderTokenAccountId,
        holder: params.holder,
        payer: params.payer || wallet.publicKey,
        systemProgram: SystemProgram.programId,
      },
    }
  );
};

export const cancelTransfer = (
  connection: Connection,
  wallet: Wallet,
  params: {
    transferId: PublicKey;
    tokenManagerId: PublicKey;
    holderTokenAccountId: PublicKey;
    holder: PublicKey;
  }
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.cancelTransfer({
    accounts: {
      transfer: params.transferId,
      tokenManager: params.tokenManagerId,
      holderTokenAccount: params.holderTokenAccountId,
      holder: params.holder,
    },
  });
};

export const acceptTransfer = (
  connection: Connection,
  wallet: Wallet,
  params: {
    transferId: PublicKey;
    tokenManagerId: PublicKey;
    holderTokenAccountId: PublicKey;
    holder: PublicKey;
    recipient: PublicKey;
    recipientTokenAccountId: PublicKey;
    mintId: PublicKey;
    transferReceiptId: PublicKey;
    listingAuthorityId: PublicKey;
    remainingAccounts: AccountMeta[];
  }
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.acceptTransfer({
    accounts: {
      transfer: params.transferId,
      listingAuthority: params.listingAuthorityId,
      transferReceipt: params.transferReceiptId,
      tokenManager: params.tokenManagerId,
      mint: params.mintId,
      recipientTokenAccount: params.recipientTokenAccountId,
      recipient: params.recipient,
      holderTokenAccount: params.holderTokenAccountId,
      holder: params.holder,
      tokenProgram: TOKEN_PROGRAM_ID,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      systemProgram: SystemProgram.programId,
    },
    remainingAccounts: params.remainingAccounts,
  });
};

export const release = (
  connection: Connection,
  wallet: Wallet,
  params: {
    listingAuthorityId: PublicKey;
    tokenManagerId: PublicKey;
    mintId: PublicKey;
    tokenManagerTokenAccountId: PublicKey;
    holderTokenAccountId: PublicKey;
    holder: PublicKey;
  }
): TransactionInstruction => {
  const provider = new AnchorProvider(connection, wallet, {});

  const transferAuthorityProgram =
    new Program<constants.LISTING_AUTHORITY_PROGRAM>(
      constants.LISTING_AUTHORITY_IDL,
      constants.LISTING_AUTHORITY_ADDRESS,
      provider
    );

  return transferAuthorityProgram.instruction.release({
    accounts: {
      listingAuthority: params.listingAuthorityId,
      tokenManager: params.tokenManagerId,
      mint: params.mintId,
      tokenManagerTokenAccount: params.tokenManagerTokenAccountId,
      holderTokenAccount: params.holderTokenAccountId,
      holder: params.holder,
      cardinalTokenManager: TOKEN_MANAGER_ADDRESS,
      tokenProgram: TOKEN_PROGRAM_ID,
      rent: SYSVAR_RENT_PUBKEY,
    },
  });
};
