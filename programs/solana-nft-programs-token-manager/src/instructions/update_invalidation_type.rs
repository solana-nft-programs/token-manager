use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateInvalidationTypeCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
}

/**
 * only allows updates from return => reissue and back
 */
pub fn handler(ctx: Context<UpdateInvalidationTypeCtx>, invalidation_type: u8) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    if token_manager.invalidation_type != InvalidationType::Return as u8 && token_manager.invalidation_type != InvalidationType::Reissue as u8 {
        return Err(error!(ErrorCode::InvalidationTypeUpdateDisallowed));
    }

    if token_manager.invalidation_type == InvalidationType::Return as u8 {
        if invalidation_type != InvalidationType::Reissue as u8 {
            return Err(error!(ErrorCode::InvalidationTypeUpdateDisallowed));
        }
        token_manager.invalidation_type = InvalidationType::Reissue as u8;
    } else if token_manager.invalidation_type == InvalidationType::Reissue as u8 {
        if invalidation_type != InvalidationType::Return as u8 {
            return Err(error!(ErrorCode::InvalidationTypeUpdateDisallowed));
        }
        token_manager.invalidation_type = InvalidationType::Return as u8;
    }
    Ok(())
}
