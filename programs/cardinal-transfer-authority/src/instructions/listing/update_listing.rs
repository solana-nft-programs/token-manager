use anchor_spl::token::TokenAccount;
use cardinal_token_manager::state::TokenManager;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateListingIx {
    pub marketplace: Pubkey,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: UpdateListingIx)]
pub struct UpdateListingCtx<'info> {
    #[account(mut, constraint = listing.token_manager == token_manager.key() @ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    listing: Box<Account<'info, Listing>>,
    #[account(mut, constraint =
        lister_mint_token_account.amount == 1 &&
        lister_mint_token_account.mint == token_manager.mint &&
        lister_mint_token_account.owner == lister.key() @ ErrorCode::InvalidListerMintTokenAccount)]
    lister_mint_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    lister: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateListingCtx>, ix: UpdateListingIx) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.lister = ctx.accounts.lister.key();
    listing.marketplace = ix.marketplace.key();
    listing.payment_amount = ix.payment_amount;
    listing.payment_mint = ix.payment_mint;

    msg!("Mint: {}", ctx.accounts.token_manager.mint.key());

    Ok(())
}
