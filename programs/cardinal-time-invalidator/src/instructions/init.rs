use {
    crate::{state::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::TokenManager},
};

#[derive(Accounts)]
#[instruction(bump: u8, expiration: i64)]
pub struct InitCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init,
        payer = payer,
        space = TIME_INVALIDATOR_SIZE,
        seeds = [TIME_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = bump,
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, bump: u8, expiration: i64) -> ProgramResult {
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    time_invalidator.bump = bump;
    time_invalidator.expiration = expiration;
    return Ok(())
}