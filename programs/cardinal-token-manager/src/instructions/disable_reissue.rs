use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct DisableReissueCtx<'info> {
    #[account(mut, constraint = token_manager.invalidation_type == InvalidationType::Reissue as u8 @ ErrorCode::InvalidInvalidationType)]
    token_manager: Box<Account<'info, TokenManager>>,
    // issuer
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
}

pub fn handler(ctx: Context<DisableReissueCtx>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.invalidation_type = InvalidationType::Return as u8;
    Ok(())
}
