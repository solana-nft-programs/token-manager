use {
    crate::{state::*},
    anchor_lang::{prelude::*, AccountsClose},
    // cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [USE_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = use_invalidator.bump,
    )]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> ProgramResult {
    if ctx.accounts.token_manager.data_is_empty() {
        ctx.accounts.use_invalidator.close(ctx.accounts.closer.to_account_info())?;
        // let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        // assert_eq!(token_manager.state, TokenManagerState::Invalidated as u8)
    }
    return Ok(())
}