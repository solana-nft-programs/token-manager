use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(Accounts)]
pub struct SetExpirationCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = time_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidTimeInvalidator)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,
}

pub fn handler(ctx: Context<SetExpirationCtx>) -> Result<()> {
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    if time_invalidator.expiration == None {
        time_invalidator.expiration = Some(ctx.accounts.token_manager.state_changed_at.checked_add(time_invalidator.duration_seconds.unwrap()).unwrap());
    }
    Ok(())
}
