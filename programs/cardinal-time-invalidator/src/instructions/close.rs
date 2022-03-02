use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*, AccountsClose},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    #[account(constraint = token_manager.key() == time_invalidator.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: UncheckedAccount<'info>,

    #[account(mut)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> Result<()> {
    if ctx.accounts.token_manager.data_is_empty() {
        ctx.accounts.time_invalidator.close(ctx.accounts.closer.to_account_info())?;
    } else {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state == TokenManagerState::Initialized as u8 && ctx.accounts.closer.key() == token_manager.issuer {
            ctx.accounts.time_invalidator.close(ctx.accounts.closer.to_account_info())?;
        }
    }
    return Ok(())
}