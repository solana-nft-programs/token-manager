use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::TokenAccount;
use solana_nft_programs_token_manager::program::SolanaNftProgramsTokenManager;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerKind;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use solana_nft_programs_payment_manager::program::SolanaNftProgramsPaymentManager;

use solana_program::sysvar::{self};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AcceptListingIx {
    pub payment_amount: u64,
}

#[derive(Accounts)]
pub struct AcceptListingCtx<'info> {
    #[account(mut, constraint = transfer_authority.key() == token_manager.transfer_authority.expect("No transfer authority for token manager") @ ErrorCode::InvalidTransferAuthority)]
    transfer_authority: Box<Account<'info, TransferAuthority>>,
    /// CHECK: This is not dangerous because this is the receipt getting initialized
    #[account(mut)]
    transfer_receipt: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because this is the receipt getting initialized
    // #[account(mut)]
    // transfer: UncheckedAccount<'info>,

    #[account(mut, close = lister)]
    listing: Box<Account<'info, Listing>>,
    /// CHECK: This is not dangerous because account is checked below
    #[account(mut)]
    lister_payment_token_account: UncheckedAccount<'info>,
    #[account(mut, constraint =
        lister_mint_token_account.amount == 1 &&
        lister_mint_token_account.mint == token_manager.mint &&
        lister_mint_token_account.owner == lister.key() @ ErrorCode::InvalidListerMintTokenAccount)]
    lister_mint_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is not dangerous because of the listing.lister check
    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: UncheckedAccount<'info>,

    #[account(mut, constraint =
        buyer_mint_token_account.mint == token_manager.mint &&
        buyer_mint_token_account.owner == buyer.key() @ ErrorCode::InvalidBuyerMintTokenAccount)]
    buyer_mint_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    buyer: Signer<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    /// CHECK: This is not dangerous because account is checked below
    #[account(mut)]
    payer_payment_token_account: UncheckedAccount<'info>,

    #[account(mut, constraint = marketplace.key() == listing.marketplace @ ErrorCode::InvalidMarketplace)]
    marketplace: Box<Account<'info, Marketplace>>,
    #[account(mut, constraint = token_manager.key() == listing.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    /// CHECK: This is not dangerous because of the token_manager.mint check
    #[account(constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because it is check in the handler
    mint_metadata_info: UncheckedAccount<'info>,

    // payment accounts
    /// CHECK: This is not dangerous because of the marketplace.payment_manager check
    #[account(mut, constraint = payment_manager.key() == marketplace.payment_manager @ ErrorCode::InvalidPaymentManager)]
    payment_manager: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because of the listing.payment_mint check
    #[account(constraint = payment_mint.key() == listing.payment_mint @ ErrorCode::InvalidPaymentMint)]
    payment_mint: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because it is checked in the payment manager handle payment with royalties instruction
    #[account(mut)]
    fee_collector_token_account: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because it is checked in the payment manager handle payment with royalties instruction
    #[account(mut)]
    fee_collector: UncheckedAccount<'info>,

    solana_nft_programs_payment_manager: Program<'info, SolanaNftProgramsPaymentManager>,
    solana_nft_programs_token_manager: Program<'info, SolanaNftProgramsTokenManager>,
    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because the ID is checked with instructions sysvar
    #[account(address = sysvar::instructions::id())]
    instructions: UncheckedAccount<'info>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, AcceptListingCtx<'info>>, ix: AcceptListingIx) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.to_vec();
    if ix.payment_amount != ctx.accounts.listing.payment_amount {
        return Err(error!(ErrorCode::ListingChanged));
    }

    if remaining_accs.is_empty() {
        return Err(error!(ErrorCode::InvalidRemainingAccountsSize));
    }
    let payment_remaining_accounts = if ctx.accounts.token_manager.kind == TokenManagerKind::Permissioned as u8 {
        &remaining_accs[..remaining_accs.len() - 1]
    } else {
        &remaining_accs[..remaining_accs.len() - 2]
    };

    // native SOL
    if ctx.accounts.payment_mint.key() == Pubkey::default() {
        let cpi_accounts = solana_nft_programs_payment_manager::cpi::accounts::HandleNativePaymentWithRoyaltiesCtx {
            payment_manager: ctx.accounts.payment_manager.to_account_info(),
            fee_collector: ctx.accounts.fee_collector.to_account_info(),
            payment_target: ctx.accounts.lister.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_metadata: ctx.accounts.mint_metadata_info.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(payment_remaining_accounts.to_vec());
        solana_nft_programs_payment_manager::cpi::handle_native_payment_with_royalties(cpi_ctx, ctx.accounts.listing.payment_amount)?;
    } else {
        // any SPL token

        // check on lister token account
        let lister_payment_token_account = Account::<TokenAccount>::try_from(&ctx.accounts.lister_payment_token_account)?;
        if lister_payment_token_account.mint != ctx.accounts.listing.payment_mint || lister_payment_token_account.owner != ctx.accounts.lister.key() {
            return Err(error!(ErrorCode::InvalidListerPaymentTokenAccount));
        }
        // check on buyer token account
        let payer_payment_token_account = Account::<TokenAccount>::try_from(&ctx.accounts.payer_payment_token_account)?;
        if payer_payment_token_account.mint != ctx.accounts.listing.payment_mint
            || payer_payment_token_account.amount < ctx.accounts.listing.payment_amount
            || payer_payment_token_account.owner != ctx.accounts.payer.key()
        {
            return Err(error!(ErrorCode::InvalidPayerPaymentTokenAccount));
        }

        let cpi_accounts = solana_nft_programs_payment_manager::cpi::accounts::HandlePaymentWithRoyaltiesCtx {
            payment_manager: ctx.accounts.payment_manager.to_account_info(),
            payer_token_account: ctx.accounts.payer_payment_token_account.to_account_info(),
            fee_collector_token_account: ctx.accounts.fee_collector_token_account.to_account_info(),
            payment_token_account: ctx.accounts.lister_payment_token_account.to_account_info(),
            payment_mint: ctx.accounts.payment_mint.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_metadata: ctx.accounts.mint_metadata_info.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(ctx.remaining_accounts.to_vec());
        solana_nft_programs_payment_manager::cpi::handle_payment_with_royalties(cpi_ctx, ctx.accounts.listing.payment_amount)?;
    }

    let transfer_authority_seeds = &[
        TRANSFER_AUTHORITY_SEED.as_bytes(),
        ctx.accounts.transfer_authority.name.as_bytes(),
        &[ctx.accounts.transfer_authority.bump],
    ];
    let transfer_authority_signer = &[&transfer_authority_seeds[..]];

    // approve
    let cpi_accounts = solana_nft_programs_token_manager::cpi::accounts::CreateTransferReceiptCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        transfer_authority: ctx.accounts.transfer_authority.to_account_info(),
        transfer_receipt: ctx.accounts.transfer_receipt.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_token_manager.to_account_info(), cpi_accounts).with_signer(transfer_authority_signer);
    solana_nft_programs_token_manager::cpi::create_transfer_receipt(cpi_ctx, ctx.accounts.buyer.key())?;

    let remaining_accounts_length = remaining_accs.len();
    let mut transfer_remaining_accounts = Vec::new();
    if ctx.accounts.token_manager.kind == TokenManagerKind::Permissioned as u8 {
        // kind Managed
        transfer_remaining_accounts.push(remaining_accs[remaining_accounts_length - 1].to_account_info());
        transfer_remaining_accounts.push(ctx.accounts.transfer_receipt.to_account_info());
    } else {
        // kind Edition
        transfer_remaining_accounts.push(remaining_accs[remaining_accounts_length - 2].to_account_info());
        transfer_remaining_accounts.push(remaining_accs[remaining_accounts_length - 1].to_account_info());
        transfer_remaining_accounts.push(ctx.accounts.transfer_receipt.to_account_info());
    }
    let cpi_accounts = solana_nft_programs_token_manager::cpi::accounts::TransferCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        current_holder_token_account: ctx.accounts.lister_mint_token_account.to_account_info(),
        recipient: ctx.accounts.buyer.to_account_info(),
        recipient_token_account: ctx.accounts.buyer_mint_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_token_manager.to_account_info(), cpi_accounts).with_remaining_accounts(transfer_remaining_accounts);
    solana_nft_programs_token_manager::cpi::transfer(cpi_ctx)?;

    // close transfer if it exists
    // assert_derivation(
    //     ctx.program_id,
    //     &ctx.accounts.transfer.to_account_info(),
    //     &[TRANSFER_SEED.as_bytes(), ctx.accounts.token_manager.key().as_ref()],
    // )?;
    // let transfer_info = Account::<Transfer>::try_from(&ctx.accounts.transfer);
    // if transfer_info.is_ok() {
    //     transfer_info?.close(ctx.accounts.lister.to_account_info())?;
    // }

    Ok(())
}
