use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
pub struct AddInvalidatorCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,

    // issuer
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>
}

pub fn handler(ctx: Context<AddInvalidatorCtx>, invalidator: Pubkey) -> Result<()> {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;
    if token_manager.invalidators.len() as u8 >= token_manager.num_invalidators {
        return Err(error!(ErrorCode::InvalidIssuerTokenAccount));
    }

    token_manager.invalidators.push(invalidator);
    return Ok(())
}