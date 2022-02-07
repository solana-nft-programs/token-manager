use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
pub struct SetPaymentMintCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,

    // issuer
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>
}

pub fn handler(ctx: Context<SetPaymentMintCtx>, payment_mint: Pubkey) -> ProgramResult {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.payment_mint = Some(payment_mint);
    return Ok(())
}