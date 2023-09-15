use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use solana_nft_programs_token_manager::program::SolanaNftProgramsTokenManager;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerState;

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut,
        constraint = (time_invalidator.max_expiration.is_some() && Clock::get().unwrap().unix_timestamp >= time_invalidator.max_expiration.unwrap())
        || (time_invalidator.expiration.is_some() && token_manager.state == TokenManagerState::Claimed as u8 && Clock::get().unwrap().unix_timestamp >= time_invalidator.expiration.unwrap())
        || (time_invalidator.expiration.is_none() && token_manager.state == TokenManagerState::Claimed as u8 && Clock::get().unwrap().unix_timestamp >= token_manager.state_changed_at.checked_add(time_invalidator.duration_seconds.expect("No extension duration")).expect("Addition error"))
        @ ErrorCode::InvalidTimeInvalidator
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    invalidator: AccountInfo<'info>,

    solana_nft_programs_token_manager: Program<'info, SolanaNftProgramsTokenManager>,
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
    rent: Sysvar<'info, Rent>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    let token_manager_key = ctx.accounts.token_manager.key();
    let time_invalidator_seeds = &[TIME_INVALIDATOR_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.time_invalidator.bump]];
    let time_invalidator_signer = &[&time_invalidator_seeds[..]];
    ctx.accounts.time_invalidator.expiration = None;

    // invalidate
    let cpi_accounts = solana_nft_programs_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
        invalidator: ctx.accounts.time_invalidator.to_account_info(),
        collector: ctx.accounts.invalidator.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_token_manager.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec())
        .with_signer(time_invalidator_signer);
    solana_nft_programs_token_manager::cpi::invalidate(cpi_ctx)?;

    Ok(())
}
