use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    #[account(constraint = token_manager.key() == time_invalidator.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        close = closer,
        seeds = [TIME_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = time_invalidator.bump,
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> ProgramResult {
    if !ctx.accounts.token_manager.data_is_empty() {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        assert_eq!(token_manager.state, TokenManagerState::Invalidated as u8)
    }
    return Ok(())
}