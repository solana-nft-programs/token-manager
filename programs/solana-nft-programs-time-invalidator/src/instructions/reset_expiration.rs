use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerState;

#[derive(Accounts)]
pub struct ResetExpirationCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Issued as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = token_manager.key() == time_invalidator.token_manager @ ErrorCode::InvalidTimeInvalidator)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,
}

pub fn handler(ctx: Context<ResetExpirationCtx>) -> Result<()> {
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    time_invalidator.expiration = None;
    Ok(())
}
