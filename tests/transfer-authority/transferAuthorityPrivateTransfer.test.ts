import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  emptyWallet,
  executeTransaction,
  findAta,
  findMintEditionId,
  findMintMetadataId,
  getTestProvider,
  tryGetAccount,
} from "@cardinal/common";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { withInit } from "@cardinal/payment-manager/dist/cjs/transaction";
import { beforeAll, expect } from "@jest/globals";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";

import {
  withAcceptTransfer,
  withCancelTransfer,
  withInitMarketplace,
  withInitTransfer,
  withInitTransferAuthority,
  withWrapToken,
} from "../../src";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import {
  getMarketplaceByName,
  getTransfer,
  getTransferAuthorityByName,
} from "../../src/programs/transferAuthority/accounts";
import { findTransferAddress } from "../../src/programs/transferAuthority/pda";

describe("Private Transfer", () => {
  let provider: CardinalProvider;
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  const marketplaceName = `mrkt-${Math.random()}`;

  const from = Keypair.generate();
  const to = Keypair.generate();
  let fromTokenAccountId: PublicKey;
  let tokenMint: PublicKey;

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);

  beforeAll(async () => {
    provider = await getTestProvider();

    const airdropLister = await provider.connection.requestAirdrop(
      from.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropLister);
    const airdropBuyer = await provider.connection.requestAirdrop(
      to.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropBuyer);

    // create rental mint
    [fromTokenAccountId, tokenMint] = await createMint(
      provider.connection,
      new Wallet(from)
    );

    const metadataId = findMintMetadataId(tokenMint);
    const metadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        updateAuthority: from.publicKey,
        mint: tokenMint,
        mintAuthority: from.publicKey,
        payer: from.publicKey,
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: "test",
            symbol: "TST",
            uri: "http://test/",
            sellerFeeBasisPoints: 10,
            creators: null,
            collection: null,
            uses: null,
          },
          isMutable: true,
          collectionDetails: null,
        },
      }
    );

    const masterEditionId = findMintEditionId(tokenMint);
    const masterEditionIx = createCreateMasterEditionV3Instruction(
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: from.publicKey,
        mint: tokenMint,
        mintAuthority: from.publicKey,
        payer: from.publicKey,
      },
      {
        createMasterEditionArgs: {
          maxSupply: new BN(1),
        },
      }
    );
    const tx = new Transaction();
    tx.instructions = [metadataIx, masterEditionIx];
    await executeTransaction(provider.connection, tx, new Wallet(from));

    const pmtx = new Transaction();
    await withInit(pmtx, provider.connection, provider.wallet, {
      paymentManagerName: paymentManagerName,
      feeCollectorId: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE.toNumber(),
      takerFeeBasisPoints: TAKER_FEE.toNumber(),
      includeSellerFeeBasisPoints: true,
      royaltyFeeShare: new BN(0),
      payer: provider.wallet.publicKey,
    });
    await executeTransaction(provider.connection, pmtx, provider.wallet);
  });

  it("Create Transfer Authority", async () => {
    const transaction = new Transaction();

    await withInitTransferAuthority(
      transaction,
      provider.connection,
      provider.wallet,
      transferAuthorityName
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkTransferAuthority = await getTransferAuthorityByName(
      provider.connection,
      transferAuthorityName
    );

    expect(checkTransferAuthority.parsed.name).toEqual(transferAuthorityName);
    expect(checkTransferAuthority.parsed.authority.toString()).toEqual(
      provider.wallet.publicKey.toString()
    );
    expect(checkTransferAuthority.parsed.allowedMarketplaces).toBeNull();
  });

  it("Wrap Token", async () => {
    const wrapTransaction = new Transaction();

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      new Wallet(from),
      tokenMint,
      { transferAuthorityName: transferAuthorityName }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      new Wallet(from)
    );
    const mintTokenAccountId = await findAta(tokenMint, from.publicKey, true);
    const mintTokenAccount = await getAccount(
      provider.connection,
      mintTokenAccountId
    );
    expect(mintTokenAccount.amount.toString()).toEqual("1");
    expect(mintTokenAccount.isFrozen).toBeTruthy();
  });

  it("Create Marketplace", async () => {
    const transaction = new Transaction();

    await withInitMarketplace(
      transaction,
      provider.connection,
      provider.wallet,
      marketplaceName,
      paymentManagerName
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const checkMarketplace = await getMarketplaceByName(
      provider.connection,
      marketplaceName
    );

    expect(checkMarketplace.parsed.name).toEqual(marketplaceName);
    const paymentManagerId = findPaymentManagerAddress(paymentManagerName);
    expect(checkMarketplace.parsed.paymentManager.toString()).toEqual(
      paymentManagerId.toString()
    );
    expect(checkMarketplace.parsed.authority.toString()).toEqual(
      provider.wallet.publicKey.toString()
    );
    expect(checkMarketplace.parsed.paymentMints).toBeNull();
  });

  it("Init Transfer", async () => {
    const transaction = new Transaction();

    await withInitTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      to.publicKey,
      tokenMint,
      fromTokenAccountId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
    );

    const checkTransfer = await getTransfer(provider.connection, tokenMint);

    const tokenManagerId = findTokenManagerAddress(tokenMint);
    expect(checkTransfer.parsed.tokenManager.toString()).toEqual(
      tokenManagerId.toString()
    );
    expect(checkTransfer.parsed.from.toString()).toEqual(
      from.publicKey.toString()
    );
    expect(checkTransfer.parsed.to.toString()).toEqual(to.publicKey.toString());
  });

  it("Cancel Transfer", async () => {
    const transaction = new Transaction();

    await withCancelTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      tokenMint
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
    );

    const checkTransferData = await tryGetAccount(() =>
      getTransfer(provider.connection, tokenMint)
    );
    expect(checkTransferData).toBeNull();
  });

  it("Init Transfer", async () => {
    const transaction = new Transaction();

    await withInitTransfer(
      transaction,
      provider.connection,
      emptyWallet(from.publicKey),
      to.publicKey,
      tokenMint,
      fromTokenAccountId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(from)
    );

    const checkTransfer = await getTransfer(provider.connection, tokenMint);

    const tokenManagerId = findTokenManagerAddress(tokenMint);
    expect(checkTransfer.parsed.tokenManager.toString()).toEqual(
      tokenManagerId.toString()
    );
    expect(checkTransfer.parsed.from.toString()).toEqual(
      from.publicKey.toBase58()
    );
    expect(checkTransfer.parsed.to.toString()).toEqual(to.publicKey.toString());
  });

  it("Accept Transfer", async () => {
    const transaction = new Transaction();

    await withAcceptTransfer(
      transaction,
      provider.connection,
      emptyWallet(to.publicKey),
      tokenMint,
      to.publicKey,
      from.publicKey
    );
    await executeTransaction(provider.connection, transaction, new Wallet(to));

    const transferId = findTransferAddress(tokenMint);
    const checkTransferData = await tryGetAccount(() =>
      getTransfer(provider.connection, transferId)
    );
    expect(checkTransferData).toBeNull();

    const toTokenAccountId = await findAta(tokenMint, to.publicKey, true);
    const toTokenAccountData = await getAccount(
      provider.connection,
      toTokenAccountId
    );
    expect(toTokenAccountData.amount.toString()).toEqual("1");
    expect(toTokenAccountData.isFrozen).toBeTruthy();

    const fromTokenAccountId = await findAta(tokenMint, from.publicKey, true);
    const fromTokenAccountData = await getAccount(
      provider.connection,
      fromTokenAccountId
    );
    expect(fromTokenAccountData.amount.toString()).toEqual("0");
    expect(fromTokenAccountData.isFrozen).toBeFalsy();
  });
});
