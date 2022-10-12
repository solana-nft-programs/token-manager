    use anchor_spl::token::TokenAccount;
use cardinal_token_manager::state::TokenManager;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct EjectCtx<'info> {
    #[account(mut)]
    listing_authority: Box<Account<'info, ListingAuthority>>,

    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = holder_token_account.mint == token_manager.mint && holder_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidHolderMintTokenAccount)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = holder.key() == token_manager.issuer @ ErrorCode::InvalidHolder)]
    holder: Signer<'info>,
}

pub fn handler(ctx: Context<EjectCtx>) -> Result<()> {
    if ctx.accounts.token_manager.transfer_authority.is_none() || ctx.accounts.token_manager.transfer_authority.unwrap() != ctx.accounts.listing_authority.key() {
        return Err(error!(ErrorCode::InvalidTransferAuthority));
    }

    let token_manager_key = ctx.accounts.token_manager.key();
    // let time_invalidator_seeds = &[TIME_INVALIDATOR_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.time_invalidator.bump]];
    // let time_invalidator_signer = &[&time_invalidator_seeds[..]];

    // // invalidate
    // let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx {
    //     token_manager: ctx.accounts.token_manager.to_account_info(),
    //     token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
    //     mint: ctx.accounts.mint.to_account_info(),
    //     recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
    //     invalidator: ctx.accounts.time_invalidator.to_account_info(),
    //     collector: ctx.accounts.invalidator.to_account_info(),
    //     token_program: ctx.accounts.token_program.to_account_info(),
    //     rent: ctx.accounts.rent.to_account_info(),
    // };
    // let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts)
    //     .with_remaining_accounts(ctx.remaining_accounts.to_vec())
    //     .with_signer(time_invalidator_signer);
    // cardinal_token_manager::cpi::invalidate(cpi_ctx)?;

    Ok(())
}
