use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
pub struct SetClaimAuthorityCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    // issuer
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>
}

pub fn handler(ctx: Context<SetClaimAuthorityCtx>, claim_authority: Pubkey) -> ProgramResult {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.claim_authority = Some(claim_authority);
    return Ok(())
}