use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{program::CardinalTokenManager, state::{TokenManager}}, 
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut,
        constraint = use_invalidator.usages >= use_invalidator.max_usages.unwrap() @ ErrorCode::InsufficientUsages,
        close = invalidator
    )]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut)]
    invalidator: Signer<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,

    // cpi accounts
    token_manager_token_account: UncheckedAccount<'info>,
    token_program: UncheckedAccount<'info>,
    mint: UncheckedAccount<'info>,
    recipient_token_account: UncheckedAccount<'info>,
    issuer_token_account: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<InvalidateCtx>) -> ProgramResult {
    let token_manager_key = ctx.accounts.token_manager.key();
    let use_invalidator_seeds = &[USE_INVALIDATOR_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.use_invalidator.bump]];
    let use_invalidator_signer = &[&use_invalidator_seeds[..]];

    // invalidate
    let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
        issuer_token_account: ctx.accounts.issuer_token_account.to_account_info(),
        invalidator: ctx.accounts.invalidator.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(use_invalidator_signer);
    cardinal_token_manager::cpi::invalidate(cpi_ctx)?;
  
    return Ok(())
}