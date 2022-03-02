use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{TokenAccount}}
};

#[derive(Accounts)]
pub struct UninitCtx<'info> {
    #[account(mut, close = issuer, constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    issuer: Signer<'info>,
    #[account(mut, constraint =
        issuer_token_account.owner == issuer.key()
        && issuer_token_account.mint == token_manager.mint
        && issuer_token_account.amount >= 1
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    issuer_token_account: Box<Account<'info, TokenAccount>>,

    system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<UninitCtx>) -> Result<()> {
    return Ok(())
}