use anchor_spl::token::TokenAccount;
use cardinal_payment_manager::state::PaymentManager;
use cardinal_token_manager::state::TokenManager;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, ThawAccount, Token, Transfer},
    cardinal_payment_manager::program::CardinalPaymentManager,
};

#[derive(Accounts)]
pub struct AcceptOfferCtx<'info> {
    listing: Box<Account<'info, Listing>>,
    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,

    #[account(mut, constraint = offer.payment_mint == listing.payment_mint @ ErrorCode::InvalidPaymentMint)]
    offer: Box<Account<'info, Offer>>,
    #[account(mut, constraint = offer_token_account.owner == offer.keytt() @ ErrorCode::InvalidOfferTokenAccount)]
    offer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint = listing.marketplace == marketplace.key() && offer.marketplace == marketplace.key() @ ErrorCode::InvalidMarketplace)]
    marketplace: Box<Account<'info, Marketplace>>,
    #[account(mut, constraint = payment_manager.key() == marketplace.payment_manager @ ErrorCode::InvalidPaymentManager)]
    payment_manager: Box<Account<'info, PaymentManager>>,
    #[account(mut, constraint = payment_manager.key() == marketplace.payment_manager @ ErrorCode::InvalidPaymentManager)]
    payment_mint: Box<Account<'info, Mint>>,

    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,
    token_manager: Box<Account<'info, TokenManager>>,
    mint_metadata: UncheckedAccount<'info>,

    cardinal_payment_manager: Program<'info, CardinalPaymentManager>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<AcceptOfferCtx>) -> Result<()> {
    let cpi_accounts = cardinal_payment_manager::cpi::accounts::HandlePaymentWithRoyaltiesCtx {
        payment_manager: ctx.accounts.payment_manager.to_account_info(),
        payer_token_account: ctx.accounts.offer_token_account.to_account_info(),
        fee_collector_token_account: ctx.accounts.fee_collector_token_account.to_account_info(),
        payment_token_account: ctx.accounts.payment_token_account.to_account_info(),
        payment_mint: ctx.accounts.payment_mint.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        mint_metadata: mint_metadata_info.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
    cardinal_payment_manager::cpi::handle_payment_with_royalties(cpi_ctx, ctx.accounts.offer.payment_amount)?;

    Ok(())
}
