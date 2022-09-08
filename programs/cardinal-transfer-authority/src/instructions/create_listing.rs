use anchor_spl::token::TokenAccount;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateListingIx {
    pub collector: Pubkey,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: CreateListingIx)]
pub struct CreateListingCtx<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = LISTING_SIZE,
        seeds = [LISTING_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    listing: Box<Account<'info, Listing>>,

    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut, constraint = lister_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidListerMintTokenAccount)]
    lister_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = lister.key() == lister_token_account.owner @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateListingCtx>, ix: CreateListingIx) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.bump = *ctx.bumps.get("listing").unwrap();
    listing.lister = ctx.accounts.lister.key();
    listing.token_manager = ctx.accounts.token_manager.key();
    listing.marketplace = ctx.accounts.marketplace.key();
    // payment
    listing.payment_amount = ix.payment_amount;
    listing.payment_mint = ix.payment_mint;

    Ok(())
}
