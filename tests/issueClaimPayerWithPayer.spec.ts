import { createMintIxs, executeTransaction, findAta } from "@cardinal/common";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { claimLinks, issueToken, withClaimToken } from "../src";
import { fromLink } from "../src/claimLinks";
import { tokenManager } from "../src/programs";
import { TokenManagerState } from "../src/programs/tokenManager";
import { getProvider } from "./workspace";

describe("Issue payer invalidate", () => {
  const recipient = Keypair.generate();
  const payer = Keypair.generate();
  const user = Keypair.generate();
  let issuerTokenAccountId: PublicKey;
  const rentalMint: Keypair = Keypair.generate();
  let claimLink: string;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      user.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropPayer = await provider.connection.requestAirdrop(
      payer.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropPayer);

    // create rental mint
    const transaction = new Transaction();
    const [ixs] = await createMintIxs(
      provider.connection,
      rentalMint.publicKey,
      user.publicKey
    );
    issuerTokenAccountId = await findAta(
      rentalMint.publicKey,
      user.publicKey,
      true
    );
    transaction.instructions = ixs;
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );
  });

  it("Issue", async () => {
    const provider = getProvider();
    const [transaction, tokenManagerId, otp] = await issueToken(
      provider.connection,
      new Wallet(user),
      {
        timeInvalidation: { maxExpiration: Date.now() / 1000 },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
        visibility: "private",
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(user)
    );

    claimLink = claimLinks.getLink(tokenManagerId, otp);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);
    expect(tokenManagerData.parsed.mint.toString()).to.eq(
      rentalMint.publicKey.toString()
    );
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer.toString()).to.eq(
      user.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      user.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).to.include(
      tokenManagerId.toString()
    );
  });

  it("Claim from link with payer", async () => {
    const provider = getProvider();

    const [tokenManagerId, otpKeypair] = fromLink(claimLink);

    // assert not lamports
    expect(provider.connection.getAccountInfo(recipient.publicKey)).to.throw();

    const transaction = await withClaimToken(
      new Transaction(),
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      {
        payer: payer.publicKey,
      }
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(payer),
      { signers: [otpKeypair, recipient] }
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).to.eq(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).to.eq(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).to.eq("0");

    const recipientAtaId = await findAta(
      rentalMint.publicKey,
      recipient.publicKey
    );
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).to.eq("1");
    expect(checkRecipientTokenAccount.isFrozen).to.eq(true);
  });
});
