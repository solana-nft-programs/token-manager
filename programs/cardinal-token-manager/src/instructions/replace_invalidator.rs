use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ReplaceInvalidatorCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.invalidators.contains(&invalidator.key()) @ ErrorCode::InvalidInvalidator
    )]
    invalidator: Signer<'info>,
}

pub fn handler(ctx: Context<ReplaceInvalidatorCtx>, new_invalidator: Pubkey) -> Result<()> {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;

    let index = token_manager.invalidators.iter().position(|current| *current == ctx.accounts.invalidator.key()).unwrap();

    token_manager.invalidators[index] = new_invalidator;

    Ok(())
}
