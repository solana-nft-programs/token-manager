import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import { web3 } from "@project-serum/anchor";
import { expectTXTable } from "@saberhq/chai-solana";
import { SolanaProvider, TransactionEnvelope } from "@saberhq/solana-contrib";
import type { Token } from "@solana/spl-token";
import * as splToken from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
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

describe("Handle payment with royalties with no metadata", () => {
  const MAKER_FEE = new BN(500);
  const TAKER_FEE = new BN(300);
  const BASIS_POINTS_DIVISOR = new BN(10000);
  const paymentAmount = new BN(1000);
  const RECIPIENT_START_PAYMENT_AMOUNT = new BN(10000000000);
  const paymentManagerName = Math.random().toString(36).slice(2, 7);
  const feeCollector = Keypair.generate();
  const issuer = Keypair.generate();

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
        includeSellerFeeBasisPoints: false,
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

    const [paymentTokenAccountId, feeCollectorTokenAccountId, _accounts] =
      await withRemainingAccountsForPayment(
        transaction,
        provider.connection,
        provider.wallet,
        rentalMint.publicKey,
        paymentMint.publicKey,
        issuer.publicKey,
        paymentManagerId
      );

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

    transaction.add(
      await handlePaymentWithRoyalties(
        provider.connection,
        provider.wallet,
        paymentManagerName,
        {
          paymentAmount: new BN(paymentAmount),
          payerTokenAccount: payerTokenAccountId,
          feeCollectorTokenAccount: feeCollectorTokenAccountId,
          paymentTokenAccount: paymentTokenAccountId,
          paymentMint: paymentMint.publicKey,
          mint: rentalMint.publicKey,
          mintMetadata: metadataId,
          royaltiesRemainingAccounts: [],
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

    const feeCollectorAtaInfo = await paymentMintInfo.getAccountInfo(
      feeCollectorTokenAccountId
    );
    expect(feeCollectorAtaInfo.amount.toNumber()).to.eq(totalFees.toNumber());

    const issuerAtaId = await findAta(
      paymentMint.publicKey,
      issuer.publicKey,
      true
    );
    const issuerAtaInfo = await paymentMintInfo.getAccountInfo(issuerAtaId);
    expect(issuerAtaInfo.amount.toNumber()).to.eq(
      paymentAmount.sub(makerFee).toNumber()
    );
  });
});
