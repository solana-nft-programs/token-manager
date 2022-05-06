use {
  crate::{errors::ErrorCode, state::*},
  anchor_lang::prelude::*,
  cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(Accounts)]
pub struct ResetExpirationCtx<'info> {
  #[account(constraint = token_manager.state == TokenManagerState::Issued as u8 @ ErrorCode::InvalidTokenManagerState)]
  token_manager: Box<Account<'info, TokenManager>>,

  #[account(mut)]
  time_invalidator: Box<Account<'info, TimeInvalidator>>,
}

pub fn handler(ctx: Context<ResetExpirationCtx>) -> Result<()> {
  let time_invalidator = &mut ctx.accounts.time_invalidator;
  time_invalidator.expiration = None;
  Ok(())
}
