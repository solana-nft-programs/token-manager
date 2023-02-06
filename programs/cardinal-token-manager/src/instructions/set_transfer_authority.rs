use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SetTransferAuthorityCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,

    // issuer
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
}

pub fn handler(ctx: Context<SetTransferAuthorityCtx>, transfer_authority: Pubkey) -> Result<()> {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.transfer_authority = Some(transfer_authority);
    Ok(())
}
