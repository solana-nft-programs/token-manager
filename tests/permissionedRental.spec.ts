import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

import { claimToken, findAta, issueToken } from "../src";
import { tokenManager } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { findTokenManagerAddress } from "../src/programs/tokenManager/pda";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Permissioned rental", () => {
  const recipient = Keypair.generate();
  const alternativeRecipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  let rentalMint: Token;
  let claimLink: string;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropRecipient = await provider.connection.requestAirdrop(
      recipient.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropRecipient);

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1,
      provider.wallet.publicKey
    );
  });

  it("Requires permissioned publicKey", async () => {
    const provider = getProvider();
    await issueToken(provider.connection, provider.wallet, {
      mint: rentalMint.publicKey,
      issuerTokenAccountId,
      useInvalidation: { totalUsages: 4 },
      kind: TokenManagerKind.Managed,
      visibility: "permissioned",
    })
      .then(() => {
        throw "Invalid success";
      })
      .catch((e) => {
        expect(e).to.not.eq("Invalid success");
      });
  });

  it("Issue token", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId] = await issueToken(
      provider.connection,
      provider.wallet,
      {
        mint: rentalMint.publicKey,
        issuerTokenAccountId,
        useInvalidation: { totalUsages: 4 },
        kind: TokenManagerKind.Managed,
        visibility: "permissioned",
        permissionedClaimApprover: recipient.publicKey,
      }
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test", {
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
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(0);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );
    expect(tokenManagerData.parsed.claimApprover).to.eqAddress(
      recipient.publicKey
    );

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    console.log("Link created: ", claimLink);
  });

  it("Cannot be claimed by incorrect address", async () => {
    const provider = getProvider();
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );

    expect(async () => {
      await expectTXTable(
        new TransactionEnvelope(
          SolanaProvider.init({
            connection: provider.connection,
            wallet: new SignerWallet(alternativeRecipient),
            opts: provider.opts,
          }),
          (
            await claimToken(
              provider.connection,
              new SignerWallet(alternativeRecipient),
              tokenManagerId
            )
          ).instructions
        ),
        "Cannot be claimed by incorrect address",
        { verbosity: "error" }
      ).to.be.rejectedWith(Error);
    });
  });

  it("Claim token", async () => {
    const provider = getProvider();
    const [tokenManagerId] = await findTokenManagerAddress(
      rentalMint.publicKey
    );

    const transaction = await claimToken(
      provider.connection,
      new SignerWallet(recipient),
      tokenManagerId
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    const checkRecipientTokenAccount = await rentalMint.getAccountInfo(
      await findAta(rentalMint.publicKey, recipient.publicKey)
    );
    expect(checkRecipientTokenAccount.amount.toNumber()).to.eq(1);
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);
  });
});
