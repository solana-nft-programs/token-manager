use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::TokenManager},
};

#[derive(Accounts)]
#[instruction(num_usages: u64)]
pub struct IncrementUsagesCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = use_invalidator.usages + num_usages <= use_invalidator.max_usages @ ErrorCode::InvalidUsages)]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<IncrementUsagesCtx>, num_usages: u64) -> ProgramResult {
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    use_invalidator.usages += num_usages;
    return Ok(())
}