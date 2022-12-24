import {
  createMintIxs,
  executeTransaction,
  findAta,
  getProvider,
} from "@cardinal/common";
import {
  CreateMetadataV2,
  DataV2,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import {
  withClaimToken,
  withDelegate,
  withIssueToken,
  withUndelegate,
} from "../../src";
import { tokenManager } from "../../src/programs";
import {
  InvalidationType,
  TokenManagerKind,
  TokenManagerState,
} from "../../src/programs/tokenManager";
import { findTokenManagerAddress } from "../../src/programs/tokenManager/pda";

describe("Add and Remove Delegate for Type Permissioned", () => {
  const user = Keypair.generate();
  const rentalMint: Keypair = Keypair.generate();

  beforeAll(async () => {
    const provider = await getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create rental mint
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      user.publicKey
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const metadataId = await Metadata.getPDA(rentalMint.publicKey);
    const metadataTx = new CreateMetadataV2(
      { feePayer: user.publicKey },
      {
        metadata: metadataId,
        metadataData: new DataV2({
          name: "test",
          symbol: "TST",
          uri: "http://test/",
          sellerFeeBasisPoints: 10,
          creators: null,
          collection: null,
          uses: null,
        }),
        updateAuthority: user.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: user.publicKey,
      }
    );
    const tx = new Transaction();
    tx.instructions = [...metadataTx.instructions];
    await executeTransaction(provider.connection, tx, new Wallet(user));
  });

  it("Issue Token Manager", async () => {
    const provider = await getProvider();
    const issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    const [transaction, tokenManagerId] = await withIssueToken(
      new Transaction(),
      provider.connection,
      new Wallet(user),
      {
        mint: rentalMint.publicKey,
        issuerTokenAccountId,
        kind: TokenManagerKind.Permissioned,
        invalidationType: InvalidationType.Release,
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators.length).equals(0);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );
    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");
  });

  it("Fail To Delegate Token", async () => {
    const provider = await getProvider();
    const transaction = new Transaction();
    await withDelegate(
      transaction,
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    expect(
      executeTransaction(provider.connection, transaction, provider.wallet)
    ).to.throw();
  });

  it("Claim Token Manager", async () => {
    const provider = await getProvider();
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );
    const claimerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    const transaction = await withClaimToken(
      new Transaction(),
      provider.connection,
      new Wallet(user),
      tokenManagerId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    const checkClaimerTokenAccount = await getAccount(
      provider.connection,
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toString()).to.eq("1");
    expect(checkClaimerTokenAccount.delegate).to.be.null;
    expect(checkClaimerTokenAccount.isFrozen).to.be.true;
  });

  it("Delegate Token", async () => {
    const provider = await getProvider();
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );
    const claimerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    const transaction = new Transaction();
    await withDelegate(
      transaction,
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const checkClaimerTokenAccount = await getAccount(
      provider.connection,
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toString()).to.eq("1");
    expect(checkClaimerTokenAccount.delegate?.toString()).to.eq(
      tokenManagerId.toString()
    );
    expect(checkClaimerTokenAccount.isFrozen).to.be.true;
  });

  it("Undelegate Token", async () => {
    const provider = await getProvider();
    const claimerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    const transaction = new Transaction();
    await withUndelegate(
      transaction,
      provider.connection,
      new Wallet(user),
      rentalMint.publicKey
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    const checkClaimerTokenAccount = await getAccount(
      provider.connection,
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toString()).to.eq("1");
    expect(checkClaimerTokenAccount.delegate).to.be.null;
    expect(checkClaimerTokenAccount.isFrozen).to.be.true;
  });
});
