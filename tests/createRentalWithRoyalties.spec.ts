import { getPaymentManager } from "@cardinal/payment-manager/dist/cjs/accounts";
import { init } from "@cardinal/payment-manager/dist/cjs/instruction";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  Creator,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import * as splToken from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { expect } from "chai";

import { findAta, rentals, tryGetAccount } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Create Rental With Royalties", () => {
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(300);
  const BASIS_POINTS_DIVISOR = new BN(10000);
  const FEE_SPLIT = new BN(50);
  const RECIPIENT_START_PAYMENT_AMOUNT = 1000000;
  const RENTAL_PAYMENT_AMONT = 1000;
  const recipient = Keypair.generate();
  const tokenCreator = Keypair.generate();
  const paymentManagerName = Math.random().toString(36).slice(2, 7);
  const feeCollector = Keypair.generate();

  const myShare = new BN(15);
  const creator1 = Keypair.generate();
  const creator1Share = new BN(30);
  const creator2 = Keypair.generate();
  const creator2Share = new BN(55);
  let recipientPaymentTokenAccountId: PublicKey;
  let issuerTokenAccountId: PublicKey;
  let paymentMint: Token;
  let rentalMint: Token;

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

    // create payment mint
    [recipientPaymentTokenAccountId, paymentMint] = await createMint(
      provider.connection,
      tokenCreator,
      recipient.publicKey,
      RECIPIENT_START_PAYMENT_AMOUNT
    );

    // create rental mint
    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1,
      tokenCreator.publicKey
    );

    const metadataId = await Metadata.getPDA(rentalMint.publicKey);
    const metadataTx = new CreateMetadataV2(
      { feePayer: tokenCreator.publicKey },
      {
        metadata: metadataId,
        metadataData: new DataV2({
          name: "test",
          symbol: "TST",
          uri: "http://test/",
          sellerFeeBasisPoints: 10,
          creators: [
            new Creator({
              address: tokenCreator.publicKey.toString(),
              verified: true,
              share: myShare.toNumber(),
            }),
            new Creator({
              address: creator1.publicKey.toString(),
              verified: false,
              share: creator1Share.toNumber(),
            }),
            new Creator({
              address: creator2.publicKey.toString(),
              verified: false,
              share: creator2Share.toNumber(),
            }),
          ],
          collection: null,
          uses: null,
        }),
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: tokenCreator.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(rentalMint.publicKey);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: tokenCreator.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint.publicKey,
        mintAuthority: tokenCreator.publicKey,
        maxSupply: new BN(1),
      }
    );
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(tokenCreator),
        opts: provider.opts,
      }),
      [...metadataTx.instructions, ...masterEditionTx.instructions]
    );

    await expectTXTable(txEnvelope, "test", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;
  });

  it("Create payment manager", async () => {
    const provider = getProvider();
    const transaction = new Transaction();

    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const ix = init(provider.connection, provider.wallet, paymentManagerName, {
      paymentManagerId: paymentManagerId,
      feeCollector: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE.toNumber(),
      takerFeeBasisPoints: TAKER_FEE.toNumber(),
      includeSellerFeeBasisPoints: false,
      authority: provider.wallet.publicKey,
      payer: provider.wallet.publicKey,
    });

    transaction.add(ix);
    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "Create Payment Manager", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const [checkPaymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const paymentManagerData = await getPaymentManager(
      provider.connection,
      checkPaymentManagerId
    );
    expect(paymentManagerData.parsed.name).to.eq(paymentManagerName);
    expect(paymentManagerData.parsed.makerFeeBasisPoints).to.eq(
      MAKER_FEE.toNumber()
    );
    expect(paymentManagerData.parsed.takerFeeBasisPoints).to.eq(
      TAKER_FEE.toNumber()
    );
  });

  it("Create rental", async () => {
    const provider = getProvider();
    const [paymentManager] = await findPaymentManagerAddress(
      paymentManagerName
    );
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      provider.wallet,
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint.publicKey,
          paymentManager: paymentManager,
        },
        timeInvalidation: {
          durationSeconds: 1000,
          maxExpiration: Date.now() / 1000 + 5000,
          extension: {
            extensionPaymentAmount: 1, // Pay 1 lamport to add 1000 seconds of expiration time
            extensionDurationSeconds: 1000,
            extensionPaymentMint: paymentMint.publicKey,
            disablePartialExtension: true,
          },
        },
        mint: rentalMint.publicKey,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
        kind: TokenManagerKind.Edition,
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
    expect(tokenManagerData.parsed.invalidators).length.greaterThanOrEqual(1);
    expect(tokenManagerData.parsed.issuer).to.eqAddress(
      provider.wallet.publicKey
    );

    const checkIssuerTokenAccount = await rentalMint.getAccountInfo(
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toNumber()).to.eq(0);

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      provider.wallet.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).to.include(
      tokenManagerId.toString()
    );
  });

  it("Claim rental", async () => {
    const provider = getProvider();

    const paymentMintInfo = new splToken.Token(
      provider.connection,
      paymentMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
    );
    const myAta = await findAta(
      paymentMint.publicKey,
      tokenCreator.publicKey,
      true
    );
    const creator1Ata = await findAta(
      paymentMint.publicKey,
      creator1.publicKey,
      true
    );
    const creator2Ata = await findAta(
      paymentMint.publicKey,
      creator2.publicKey,
      true
    );

    expect(async () => {
      await expect(() =>
        paymentMintInfo.getAccountInfo(creator1Ata)
      ).to.be.rejectedWith(Error);
    });
    expect(async () => {
      await expect(() =>
        paymentMintInfo.getAccountInfo(creator2Ata)
      ).to.be.rejectedWith(Error);
    });

    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );

    const transaction = await rentals.claimRental(
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

    const checkRecipientPaymentTokenAccount = await paymentMint.getAccountInfo(
      recipientPaymentTokenAccountId
    );

    const BN_RENTAL_PAYMENT_AMONT = new BN(RENTAL_PAYMENT_AMONT);
    const makerFee =
      BN_RENTAL_PAYMENT_AMONT.mul(MAKER_FEE).div(BASIS_POINTS_DIVISOR);
    const takerFee =
      BN_RENTAL_PAYMENT_AMONT.mul(TAKER_FEE).div(BASIS_POINTS_DIVISOR);
    const totalFees = makerFee.add(takerFee);
    const splitFees = totalFees.mul(FEE_SPLIT).div(new BN(100));

    expect(checkRecipientPaymentTokenAccount.amount.toNumber()).to.eq(
      RECIPIENT_START_PAYMENT_AMOUNT -
        RENTAL_PAYMENT_AMONT -
        takerFee.toNumber()
    );

    const myFunds = splitFees.mul(myShare).div(new BN(100));
    const myAtaInfo = await paymentMintInfo.getAccountInfo(myAta);
    expect(myAtaInfo.amount.toNumber()).to.eq(myFunds.toNumber());

    const creator1Funds = splitFees.mul(creator1Share).div(new BN(100));
    const creator1AtaInfo = await paymentMintInfo.getAccountInfo(creator1Ata);
    expect(creator1AtaInfo.amount.toNumber()).to.eq(creator1Funds.toNumber());

    const creator2Funds = splitFees.mul(creator2Share).div(new BN(100));
    const creator2AtaInfo = await paymentMintInfo.getAccountInfo(creator2Ata);
    expect(creator2AtaInfo.amount.toNumber()).to.eq(creator2Funds.toNumber());
  });

  it("Extend Rental", async () => {
    const provider = getProvider();
    const tokenManagerId = await tokenManager.pda.tokenManagerAddressFromMint(
      provider.connection,
      rentalMint.publicKey
    );

    await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        (
          await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
        )[0]
      )
    );

    const transaction = await rentals.extendRentalExpiration(
      provider.connection,
      new SignerWallet(recipient),
      tokenManagerId,
      1000
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: new SignerWallet(recipient),
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );

    await expectTXTable(txEnvelope, "extend", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        (
          await timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
        )[0]
      )
    );
  });
});
