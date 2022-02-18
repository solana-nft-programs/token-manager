use {
    crate::{state::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct InitCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = USE_INVALIDATOR_SIZE,
        seeds = [USE_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, max_usages: Option<u64>) -> ProgramResult {
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    use_invalidator.bump = *ctx.bumps.get("use_invalidator").unwrap();
    use_invalidator.usages = 0;
    if ctx.accounts.token_manager.state == TokenManagerState::Initialized as u8 {
        use_invalidator.max_usages = max_usages;
    }
    return Ok(())
}