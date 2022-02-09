use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        mut,
        close = closer,
        seeds = [TIME_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = time_invalidator.bump,
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(_ctx: Context<CloseCtx>) -> ProgramResult {
    return Ok(())
}