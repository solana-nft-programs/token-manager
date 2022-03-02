use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{program::CardinalTokenManager, state::{TokenManager}}, 
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut)]
    invalidator: Signer<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    token_program: UncheckedAccount<'info>,

    // cpi accounts
    #[account(mut)]
    token_manager_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    mint: UncheckedAccount<'info>,
    #[account(mut)]
    recipient_token_account: UncheckedAccount<'info>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
    let token_manager_key = ctx.accounts.token_manager.key();
    let time_invalidator_seeds = &[TIME_INVALIDATOR_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.time_invalidator.bump]];
    let time_invalidator_signer = &[&time_invalidator_seeds[..]];

    // invalidate
    let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
        invalidator: ctx.accounts.time_invalidator.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec())
        .with_signer(time_invalidator_signer);
    cardinal_token_manager::cpi::invalidate(cpi_ctx)?;
  
    return Ok(())
}