use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use cardinal_token_manager::state::TokenManager;
use cardinal_token_manager::state::TokenManagerState;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateMaxExpirationIx {
    pub new_max_expiration: i64,
}

#[derive(Accounts)]
pub struct UpdateMaxExpirationCtx<'info> {
    #[account(constraint = token_manager.state != TokenManagerState::Invalidated as u8 && time_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateMaxExpirationCtx>, ix: UpdateMaxExpirationIx) -> Result<()> {
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    let token_manager = &ctx.accounts.token_manager;

    if token_manager.state == TokenManagerState::Claimed as u8 {
        if let Some(expiration) = time_invalidator.expiration {
            if ix.new_max_expiration < expiration {
                return Err(error!(ErrorCode::InvalidNewMaxExpiration));
            }
        }

        if let Some(max_expiration) = time_invalidator.max_expiration {
            if ix.new_max_expiration < max_expiration && time_invalidator.expiration.is_none() {
                return Err(error!(ErrorCode::InvalidNewMaxExpiration));
            }
        }

        if time_invalidator.max_expiration.is_none()
            && time_invalidator.duration_seconds.is_some()
            && ix.new_max_expiration < token_manager.state_changed_at.checked_add(time_invalidator.duration_seconds.unwrap()).expect("Add error")
        {
            return Err(error!(ErrorCode::InvalidNewMaxExpiration));
        }
    }
    time_invalidator.max_expiration = Some(ix.new_max_expiration);

    Ok(())
}
