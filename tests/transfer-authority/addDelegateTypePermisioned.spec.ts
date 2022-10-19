import {
  CreateMetadataV2,
  DataV2,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import {
  findAta,
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
import { createMint } from "../utils";
import { getProvider } from "../workspace";

describe("Add and Remove Delegate for Type Permissioned", () => {
  const user = Keypair.generate();
  let rentalMint: Token;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create rental mint
    [, rentalMint] = await createMint(
      provider.connection,
      user,
      user.publicKey,
      1,
      user.publicKey
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

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...metadataTx.instructions]
    );

    await expectTXTable(txEnvelope, "Create Token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
  });

  it("Issue Token Manager", async () => {
    const provider = getProvider();
    const issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    const [transaction, tokenManagerId] = await withIssueToken(
      new Transaction(),
      provider.connection,
      new SignerWallet(user),
      {
        mint: rentalMint.publicKey,
        issuerTokenAccountId,
        kind: TokenManagerKind.Permissioned,
        invalidationType: InvalidationType.Release,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "issue token manager", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint).to.eqAddress(rentalMint.publicKey);
    expect(tokenManagerData.parsed.invalidators.length).equals(0);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(user.publicKey);
    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);
  });

  it("Fail To Delegate Token", async () => {
    const provider = getProvider();
    const transaction = new Transaction();
    await withDelegate(
      transaction,
      provider.connection,
      new SignerWallet(user),
      rentalMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    expect(async () => {
      await expectTXTable(txEnvelope, "delegate token", {
        verbosity: "error",
      }).to.be.rejectedWith(Error);
    });
  });

  it("Claim Token Manager", async () => {
    const provider = getProvider();
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
      new SignerWallet(user),
      tokenManagerId
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "claim token manager", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    const checkClaimerTokenAccount = await rentalMint.getAccountInfo(
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkClaimerTokenAccount.delegate).to.be.null;
    expect(checkClaimerTokenAccount.isFrozen).to.be.true;
  });

  it("Delegate Token", async () => {
    const provider = getProvider();
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
      new SignerWallet(user),
      rentalMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "delegate token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkClaimerTokenAccount = await rentalMint.getAccountInfo(
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkClaimerTokenAccount.delegate?.toString()).to.eq(
      tokenManagerId.toString()
    );
    expect(checkClaimerTokenAccount.isFrozen).to.be.true;
  });

  it("Undelegate Token", async () => {
    const provider = getProvider();
    const claimerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    const transaction = new Transaction();
    await withUndelegate(
      transaction,
      provider.connection,
      new SignerWallet(user),
      rentalMint.publicKey
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(user),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "undelegate token", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const checkClaimerTokenAccount = await rentalMint.getAccountInfo(
      claimerTokenAccountId
    );
    expect(checkClaimerTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkClaimerTokenAccount.delegate).to.be.null;
    expect(checkClaimerTokenAccount.isFrozen).to.be.true;
  });
});
