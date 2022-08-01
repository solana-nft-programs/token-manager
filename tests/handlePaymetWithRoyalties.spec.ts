import {
  CreateMasterEditionV3,
  CreateMetadataV2,
  Creator,
  DataV2,
  MasterEdition,
  Metadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { web3 } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import {
  SignerWallet,
  SolanaProvider,
  TransactionEnvelope,
} from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import * as splToken from "@solana/spl-token";
import type { AccountMeta } from "@solana/web3.js";
import { Keypair, LAMPORTS_PER_SOL, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { expect } from "chai";

import { findAta, withFindOrInitAssociatedTokenAccount } from "../src";
import { getPaymentManager } from "../src/programs/paymentManager/accounts";
import {
  handlePaymentWithRoyalties,
  init,
} from "../src/programs/paymentManager/instruction";
import { findPaymentManagerAddress } from "../src/programs/paymentManager/pda";
import { withRemainingAccountsForPayment } from "../src/programs/tokenManager";
import { createMint } from "./utils";
import { getProvider } from "./workspace";

describe("Handle payment with royalties", () => {
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(300);
  const BASIS_POINTS_DIVISOR = new BN(10000);
  const FEE_SPLIT = new BN(50);
  const paymentAmount = new BN(1000);
  const RECIPIENT_START_PAYMENT_AMOUNT = new BN(10000000000);
  const paymentManagerName = Math.random().toString(36).slice(2, 7);
  const feeCollector = Keypair.generate();

  const creator1 = Keypair.generate();
  const creator1Share = new BN(15);
  const creator2 = Keypair.generate();
  const creator2Share = new BN(30);
  const creator3 = Keypair.generate();
  const creator3Share = new BN(55);
  const tokenCreator = Keypair.generate();
  let paymentMint: Token;
  let rentalMint: Token;

  before(async () => {
    const provider = getProvider();
    const airdropCreator = await provider.connection.requestAirdrop(
      tokenCreator.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    // create payment mint
    [, paymentMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      RECIPIENT_START_PAYMENT_AMOUNT.toNumber()
    );

    // create rental mint
    [, rentalMint] = await createMint(
      provider.connection,
      tokenCreator,
      provider.wallet.publicKey,
      1,
      tokenCreator.publicKey
    );

    // specify creators shares
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
              share: 0,
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
            new Creator({
              address: creator3.publicKey.toString(),
              verified: false,
              share: creator3Share.toNumber(),
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
    const transaction = new web3.Transaction();

    const [ix] = await init(
      provider.connection,
      provider.wallet,
      paymentManagerName,
      {
        feeCollector: feeCollector.publicKey,
        makerFeeBasisPoints: MAKER_FEE.toNumber(),
        takerFeeBasisPoints: TAKER_FEE.toNumber(),
      }
    );

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

  it("Handle payment with royalties", async () => {
    const provider = getProvider();
    const transaction = new web3.Transaction();

    const metadataId = await Metadata.getPDA(rentalMint.publicKey);
    const [paymentManagerId] = await findPaymentManagerAddress(
      paymentManagerName
    );

    const [paymentTokenAccountId, feeCollectorTokenAccount, _accounts] =
      await withRemainingAccountsForPayment(
        transaction,
        provider.connection,
        provider.wallet,
        rentalMint.publicKey,
        paymentMint.publicKey,
        provider.wallet.publicKey,
        paymentManagerId
      );
    const royaltiesRemainingAccounts: AccountMeta[] = [];

    ///
    const creator1MintTokenAccount = await withFindOrInitAssociatedTokenAccount(
      new Transaction(),
      provider.connection,
      paymentMint.publicKey,
      creator1.publicKey,
      provider.wallet.publicKey,
      true
    );
    royaltiesRemainingAccounts.push({
      pubkey: creator1MintTokenAccount,
      isSigner: false,
      isWritable: true,
    });

    const creator2MintTokenAccount = await withFindOrInitAssociatedTokenAccount(
      new Transaction(),
      provider.connection,
      paymentMint.publicKey,
      creator2.publicKey,
      provider.wallet.publicKey,
      true
    );
    royaltiesRemainingAccounts.push({
      pubkey: creator2MintTokenAccount,
      isSigner: false,
      isWritable: true,
    });

    const creator3MintTokenAccount = await withFindOrInitAssociatedTokenAccount(
      new Transaction(),
      provider.connection,
      paymentMint.publicKey,
      creator3.publicKey,
      provider.wallet.publicKey,
      true
    );
    royaltiesRemainingAccounts.push({
      pubkey: creator3MintTokenAccount,
      isSigner: false,
      isWritable: true,
    });
    ///

    const payerTokenAccountId = await withFindOrInitAssociatedTokenAccount(
      transaction,
      provider.connection,
      paymentMint.publicKey,
      provider.wallet.publicKey,
      provider.wallet.publicKey,
      true
    );

    const paymentMintInfo = new splToken.Token(
      provider.connection,
      paymentMint.publicKey,
      splToken.TOKEN_PROGRAM_ID,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      null
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
    const creator3Ata = await findAta(
      paymentMint.publicKey,
      creator3.publicKey,
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
    expect(async () => {
      await expect(() =>
        paymentMintInfo.getAccountInfo(creator3Ata)
      ).to.be.rejectedWith(Error);
    });

    transaction.add(
      await handlePaymentWithRoyalties(
        provider.connection,
        provider.wallet,
        paymentManagerName,
        {
          paymentAmount: new BN(paymentAmount),
          payerTokenAccount: payerTokenAccountId,
          feeCollectorTokenAccount: feeCollectorTokenAccount,
          paymentTokenAccount: paymentTokenAccountId,
          paymentMint: paymentMint.publicKey,
          mint: rentalMint.publicKey,
          mintMetadata: metadataId,
          royaltiesRemainingAccounts: royaltiesRemainingAccounts,
        }
      )
    );

    const txEnvelope = new TransactionEnvelope(
      SolanaProvider.init({
        connection: provider.connection,
        wallet: provider.wallet,
        opts: provider.opts,
      }),
      [...transaction.instructions]
    );
    await expectTXTable(txEnvelope, "Handle Payment With Royalties", {
      verbosity: "error",
      formatLogs: true,
    }).to.be.fulfilled;

    const makerFee = paymentAmount.mul(MAKER_FEE).div(BASIS_POINTS_DIVISOR);
    const takerFee = paymentAmount.mul(TAKER_FEE).div(BASIS_POINTS_DIVISOR);
    const totalFees = makerFee.add(takerFee);
    const splitFees = totalFees.mul(FEE_SPLIT).div(new BN(100));

    const creator1Funds = splitFees.mul(creator1Share).div(new BN(100));
    const creator1AtaInfo = await paymentMintInfo.getAccountInfo(creator1Ata);
    expect(creator1AtaInfo.amount.toNumber()).to.eq(creator1Funds.toNumber());

    const creator2Funds = splitFees.mul(creator2Share).div(new BN(100));
    const creator2AtaInfo = await paymentMintInfo.getAccountInfo(creator2Ata);
    expect(creator2AtaInfo.amount.toNumber()).to.eq(creator2Funds.toNumber());

    const creator3Funds = splitFees.mul(creator3Share).div(new BN(100));
    const creator3AtaInfo = await paymentMintInfo.getAccountInfo(creator3Ata);
    expect(creator3AtaInfo.amount.toNumber()).to.eq(creator3Funds.toNumber());
  });
});
