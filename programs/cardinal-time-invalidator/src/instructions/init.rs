use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
#[instruction(duration: i64, start_on_init: bool)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = TIME_INVALIDATOR_SIZE,
        seeds = [TIME_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, duration: i64, start_on_init: bool) -> ProgramResult {
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    time_invalidator.bump = *ctx.bumps.get("time_invalidator").unwrap();
    time_invalidator.token_manager = ctx.accounts.token_manager.key();
    time_invalidator.duration = duration;
    time_invalidator.start_on_init = start_on_init;
    if start_on_init {
        time_invalidator.expiration = Some(Clock::get().unwrap().unix_timestamp + duration);
    }
    return Ok(())
}