use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::{
        program::CardinalTokenManager,
        state::{TokenManager, TokenManagerState},
    },
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut,
        constraint = time_invalidator.expiration != None && Clock::get().unwrap().unix_timestamp >= time_invalidator.expiration.unwrap()
        || time_invalidator.max_expiration != None && Clock::get().unwrap().unix_timestamp >= time_invalidator.max_expiration.unwrap()
        || time_invalidator.expiration == None && token_manager.state == TokenManagerState::Claimed as u8 && Clock::get().unwrap().unix_timestamp >= token_manager.state_changed_at + time_invalidator.duration_seconds.unwrap()
        @ ErrorCode::InvalidTimeInvalidator
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    invalidator: AccountInfo<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    token_program: UncheckedAccount<'info>,

    // cpi accounts
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    token_manager_token_account: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    mint: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    recipient_token_account: UncheckedAccount<'info>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
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
        collector: ctx.accounts.invalidator.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec())
        .with_signer(time_invalidator_signer);
    cardinal_token_manager::cpi::invalidate(cpi_ctx)?;

    Ok(())
}
