use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*, AccountsClose},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState, InvalidationType}},
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    #[account(constraint = token_manager.key() == time_invalidator.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [TIME_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = time_invalidator.bump,
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> ProgramResult {
    if ctx.accounts.token_manager.data_is_empty() {
        ctx.accounts.time_invalidator.close(ctx.accounts.closer.to_account_info())?;
    } else {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state == TokenManagerState::Initialized as u8 && ctx.accounts.closer.key() == token_manager.issuer {
            ctx.accounts.time_invalidator.close(ctx.accounts.closer.to_account_info())?;
        }
        if token_manager.state == TokenManagerState::Invalidated as u8 && token_manager.invalidation_type != InvalidationType::Invalidate as u8 {
            ctx.accounts.time_invalidator.close(ctx.accounts.closer.to_account_info())?;
        }
    }
    return Ok(())
}