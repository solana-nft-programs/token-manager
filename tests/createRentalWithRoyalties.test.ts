import type { CardinalProvider } from "@cardinal/common";
import {
  createMint,
  executeTransaction,
  findAta,
  getTestProvider,
  tryGetAccount,
} from "@cardinal/common";
import { getPaymentManager } from "@cardinal/payment-manager/dist/cjs/accounts";
import { findPaymentManagerAddress } from "@cardinal/payment-manager/dist/cjs/pda";
import { withInit } from "@cardinal/payment-manager/dist/cjs/transaction";
import { beforeAll, expect } from "@jest/globals";
import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  Creator,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { BN, Wallet } from "@project-serum/anchor";
import { getAccount } from "@solana/spl-token";
import type { PublicKey } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";

import { rentals } from "../src";
import { timeInvalidator, tokenManager } from "../src/programs";
import {
  TokenManagerKind,
  TokenManagerState,
} from "../src/programs/tokenManager";

describe("Create Rental With Royalties", () => {
  let provider: CardinalProvider;
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
  let paymentMint: PublicKey;
  let rentalMint: PublicKey;

  beforeAll(async () => {
    provider = await getTestProvider();
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
      new Wallet(tokenCreator),
      { target: recipient.publicKey, amount: RECIPIENT_START_PAYMENT_AMOUNT }
    );

    [issuerTokenAccountId, rentalMint] = await createMint(
      provider.connection,
      new Wallet(tokenCreator),
      { target: provider.wallet.publicKey }
    );

    const metadataId = await Metadata.getPDA(rentalMint);
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
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
      }
    );

    const masterEditionId = await MasterEdition.getPDA(rentalMint);
    const masterEditionTx = new CreateMasterEditionV3(
      { feePayer: tokenCreator.publicKey },
      {
        edition: masterEditionId,
        metadata: metadataId,
        updateAuthority: tokenCreator.publicKey,
        mint: rentalMint,
        mintAuthority: tokenCreator.publicKey,
        maxSupply: new BN(1),
      }
    );
    const tx = new Transaction();
    tx.instructions = [
      ...metadataTx.instructions,
      ...masterEditionTx.instructions,
    ];
    await executeTransaction(provider.connection, tx, new Wallet(tokenCreator));
  });

  it("Create payment manager", async () => {
    const pmtx = new Transaction();
    await withInit(pmtx, provider.connection, provider.wallet, {
      paymentManagerName: paymentManagerName,
      feeCollectorId: feeCollector.publicKey,
      makerFeeBasisPoints: MAKER_FEE.toNumber(),
      takerFeeBasisPoints: TAKER_FEE.toNumber(),
      includeSellerFeeBasisPoints: false,
      payer: provider.wallet.publicKey,
    });
    await executeTransaction(provider.connection, pmtx, provider.wallet);

    const checkPaymentManagerId = findPaymentManagerAddress(paymentManagerName);
    const paymentManagerData = await getPaymentManager(
      provider.connection,
      checkPaymentManagerId
    );
    expect(paymentManagerData.parsed.name).toEqual(paymentManagerName);
    expect(paymentManagerData.parsed.makerFeeBasisPoints).toEqual(
      MAKER_FEE.toNumber()
    );
    expect(paymentManagerData.parsed.takerFeeBasisPoints).toEqual(
      TAKER_FEE.toNumber()
    );
  });

  it("Create rental", async () => {
    const paymentManager = findPaymentManagerAddress(paymentManagerName);
    const [transaction, tokenManagerId] = await rentals.createRental(
      provider.connection,
      provider.wallet,
      {
        claimPayment: {
          paymentAmount: RENTAL_PAYMENT_AMONT,
          paymentMint: paymentMint,
          paymentManager: paymentManager,
        },
        timeInvalidation: {
          durationSeconds: 1000,
          maxExpiration: Date.now() / 1000 + 5000,
          extension: {
            extensionPaymentAmount: 1, // Pay 1 lamport to add 1000 seconds of expiration time
            extensionDurationSeconds: 1000,
            extensionPaymentMint: paymentMint,
            disablePartialExtension: true,
          },
        },
        mint: rentalMint,
        issuerTokenAccountId: issuerTokenAccountId,
        amount: new BN(1),
        kind: TokenManagerKind.Edition,
      }
    );
    await executeTransaction(provider.connection, transaction, provider.wallet);

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Issued);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);
    expect(tokenManagerData.parsed.mint.toString()).toEqual(
      rentalMint.toString()
    );
    expect(tokenManagerData.parsed.invalidators.length).toBeGreaterThanOrEqual(
      1
    );
    expect(tokenManagerData.parsed.issuer.toString()).toEqual(
      provider.wallet.publicKey.toString()
    );

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    // check receipt-index
    const tokenManagers = await tokenManager.accounts.getTokenManagersForIssuer(
      provider.connection,
      provider.wallet.publicKey
    );
    expect(tokenManagers.map((i) => i.pubkey.toString())).toContain(
      tokenManagerId.toString()
    );
  });

  it("Claim rental", async () => {
    const myAta = await findAta(paymentMint, tokenCreator.publicKey, true);
    const creator1Ata = await findAta(paymentMint, creator1.publicKey, true);
    const creator2Ata = await findAta(paymentMint, creator2.publicKey, true);

    await expect(
      getAccount(provider.connection, creator1Ata)
    ).rejects.toThrow();
    await expect(
      getAccount(provider.connection, creator2Ata)
    ).rejects.toThrow();

    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    const transaction = await rentals.claimRental(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    const tokenManagerData = await tokenManager.accounts.getTokenManager(
      provider.connection,
      tokenManagerId
    );
    expect(tokenManagerData.parsed.state).toEqual(TokenManagerState.Claimed);
    expect(tokenManagerData.parsed.amount.toNumber()).toEqual(1);

    const checkIssuerTokenAccount = await getAccount(
      provider.connection,
      issuerTokenAccountId
    );
    expect(checkIssuerTokenAccount.amount.toString()).toEqual("0");

    const recipientAtaId = await findAta(rentalMint, recipient.publicKey);
    const checkRecipientTokenAccount = await getAccount(
      provider.connection,
      recipientAtaId
    );
    expect(checkRecipientTokenAccount.amount.toString()).toEqual("1");
    expect(checkRecipientTokenAccount.isFrozen).toEqual(true);

    const checkRecipientPaymentTokenAccount = await getAccount(
      provider.connection,
      recipientPaymentTokenAccountId
    );

    const BN_RENTAL_PAYMENT_AMONT = new BN(RENTAL_PAYMENT_AMONT);
    const makerFee =
      BN_RENTAL_PAYMENT_AMONT.mul(MAKER_FEE).div(BASIS_POINTS_DIVISOR);
    const takerFee =
      BN_RENTAL_PAYMENT_AMONT.mul(TAKER_FEE).div(BASIS_POINTS_DIVISOR);
    const totalFees = makerFee.add(takerFee);
    const splitFees = totalFees.mul(FEE_SPLIT).div(new BN(100));

    expect(checkRecipientPaymentTokenAccount.amount.toString()).toEqual(
      (
        RECIPIENT_START_PAYMENT_AMOUNT -
        RENTAL_PAYMENT_AMONT -
        takerFee.toNumber()
      ).toString()
    );

    const myFunds = splitFees.mul(myShare).div(new BN(100));
    const myAtaInfo = await getAccount(provider.connection, myAta);
    expect(myAtaInfo.amount.toString()).toEqual(myFunds.toString());

    const creator1Funds = splitFees.mul(creator1Share).div(new BN(100));
    const creator1AtaInfo = await getAccount(provider.connection, creator1Ata);
    expect(creator1AtaInfo.amount.toString()).toEqual(creator1Funds.toString());

    const creator2Funds = splitFees.mul(creator2Share).div(new BN(100));
    const creator2AtaInfo = await getAccount(provider.connection, creator2Ata);
    expect(creator2AtaInfo.amount.toString()).toEqual(creator2Funds.toString());
  });

  it("Extend Rental", async () => {
    const tokenManagerId =
      tokenManager.pda.tokenManagerAddressFromMint(rentalMint);

    await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );

    const transaction = await rentals.extendRentalExpiration(
      provider.connection,
      new Wallet(recipient),
      tokenManagerId,
      1000
    );
    await executeTransaction(
      provider.connection,
      transaction,
      new Wallet(recipient)
    );

    await tryGetAccount(async () =>
      timeInvalidator.accounts.getTimeInvalidator(
        provider.connection,
        timeInvalidator.pda.findTimeInvalidatorAddress(tokenManagerId)
      )
    );
  });
});
