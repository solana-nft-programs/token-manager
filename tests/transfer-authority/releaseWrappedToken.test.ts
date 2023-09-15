import { Wallet } from "@coral-xyz/anchor";
import { beforeAll, expect } from "@jest/globals";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import type { SolanaProvider } from "@solana-nft-programs/common";
import {
  createMint,
  executeTransaction,
  findAta,
  findMintEditionId,
  findMintMetadataId,
  getTestProvider,
} from "@solana-nft-programs/common";
import { withInit } from "@solana-nft-programs/payment-manager/dist/cjs/transaction";
import { BN } from "bn.js";

import {
  withInitTransferAuthority,
  withRelease,
  withWrapToken,
} from "../../src";
import { getTokenManager } from "../../src/programs/tokenManager/accounts";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";
import { getTransferAuthorityByName } from "../../src/programs/transferAuthority/accounts";
import { findTransferAuthorityAddress } from "../../src/programs/transferAuthority/pda";

describe("Release wrapped token", () => {
  const transferAuthorityName = `lst-auth-${Math.random()}`;
  let provider: SolanaProvider;

  const lister = Keypair.generate();
  const buyer = Keypair.generate();
  let tokenMint: PublicKey;
  let listerTokenAccountId: PublicKey;

  const paymentManagerName = `pm-${Math.random()}`;
  const feeCollector = Keypair.generate();
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(0);

  beforeAll(async () => {
    provider = await getTestProvider();

    const airdropLister = await provider.connection.requestAirdrop(
      lister.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropLister);
    const airdropBuyer = await provider.connection.requestAirdrop(
      buyer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropBuyer);

    // create rental mint
    [listerTokenAccountId, tokenMint] = await createMint(
      provider.connection,
      new Wallet(lister)
    );

    const metadataId = findMintMetadataId(tokenMint);
    const metadataIx = createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataId,
        updateAuthority: lister.publicKey,
        mint: tokenMint,
        mintAuthority: lister.publicKey,
        payer: lister.publicKey,
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
        updateAuthority: lister.publicKey,
        mint: tokenMint,
        mintAuthority: lister.publicKey,
        payer: lister.publicKey,
      },
      {
        createMasterEditionArgs: {
          maxSupply: new BN(1),
        },
      }
    );
    const tx = new Transaction();
    tx.instructions = [metadataIx, masterEditionIx];
    await executeTransaction(provider.connection, tx, new Wallet(lister));

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
    const transferAuthorityId = findTransferAuthorityAddress(
      transferAuthorityName
    );

    await withWrapToken(
      wrapTransaction,
      provider.connection,
      new Wallet(lister),
      tokenMint,
      {
        transferAuthorityName: transferAuthorityName,
        creator: transferAuthorityId,
      }
    );
    await executeTransaction(
      provider.connection,
      wrapTransaction,
      new Wallet(lister)
    );
    const mintTokenAccountId = await findAta(tokenMint, lister.publicKey, true);
    const mintTokenAccount = await getAccount(
      provider.connection,
      mintTokenAccountId
    );
    expect(mintTokenAccount.amount.toString()).toEqual("1");
    expect(mintTokenAccount.isFrozen).toBeTruthy();

    const tokenManagerId = findTokenManagerAddress(tokenMint);
    const tokenManagerData = await getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(
      tokenManagerData.parsed.invalidators
        .map((inv) => inv.toString())
        .toString()
    ).toEqual([transferAuthorityId.toString()].toString());
  });

  it("Release token", async () => {
    const transaction = new Transaction();

    const transferAuthorityId = findTransferAuthorityAddress(
      transferAuthorityName
    );

    await withRelease(
      transaction,
      provider.connection,
      new Wallet(lister),
      tokenMint,
      transferAuthorityId,
      listerTokenAccountId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(lister)
    );

    const mintTokenAccountId = await findAta(tokenMint, lister.publicKey, true);
    const mintTokenAccount = await getAccount(
      provider.connection,
      mintTokenAccountId
    );
    expect(mintTokenAccount.amount.toString()).toEqual("1");
    expect(mintTokenAccount.isFrozen).toBeFalsy();
  });
});
