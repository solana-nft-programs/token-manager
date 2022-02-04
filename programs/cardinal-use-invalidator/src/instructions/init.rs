use {
    crate::{state::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::TokenManager},
};

#[derive(Accounts)]
#[instruction(bump: u8, _max_usages: u64)]
pub struct InitCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init,
        payer = payer,
        space = USE_INVALIDATOR_SIZE,
        seeds = [USE_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = bump,
    )]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, bump: u8, max_usages: u64) -> ProgramResult {
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    use_invalidator.bump = bump;
    use_invalidator.max_usages = max_usages;
    return Ok(())
}