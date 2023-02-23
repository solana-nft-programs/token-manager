use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateInvalidatorsCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.invalidators.contains(&invalidator.key()) @ ErrorCode::InvalidInvalidator
    )]
    invalidator: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateInvalidatorsCtx>, new_invalidators: Vec<Pubkey>) -> Result<()> {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;

    let new_invalidators_length = new_invalidators.len() as u8;

    if new_invalidators_length == 0 {
        return Err(error!(ErrorCode::EmptyInvalidators));
    }

    if new_invalidators_length > token_manager.num_invalidators {
        return Err(error!(ErrorCode::InvalidatorsTooBig));
    }

    token_manager.invalidators = new_invalidators;

    Ok(())
}
