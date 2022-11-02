use anchor_spl::token::{Mint, Token, TokenAccount};
use cardinal_token_manager::{program::CardinalTokenManager, state::TokenManager};

use {crate::errors::ErrorCode, anchor_lang::prelude::*};

#[derive(Accounts)]
pub struct ReleaseCtx<'info> {
    #[account(mut)]
    invalidator: Signer<'info>,

    #[account(mut, constraint = token_manager.invalidators.contains(&invalidator.key()) @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    token_manager_token_account: UncheckedAccount<'info>,

    #[account(mut, constraint = holder_token_account.mint == token_manager.mint && holder_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidHolderMintTokenAccount)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = holder.key() == holder_token_account.owner @ ErrorCode::InvalidHolder)]
    holder: Signer<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    collector: UncheckedAccount<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ReleaseCtx<'info>>) -> Result<()> {
    if ctx.accounts.token_manager.transfer_authority.is_none() {
        return Err(error!(ErrorCode::InvalidTransferAuthority));
    }

    // invalidate
    let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        recipient_token_account: ctx.accounts.holder_token_account.to_account_info(),
        invalidator: ctx.accounts.invalidator.to_account_info(),
        collector: ctx.accounts.collector.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_remaining_accounts(ctx.remaining_accounts.to_vec());
    cardinal_token_manager::cpi::invalidate(cpi_ctx)?;

    Ok(())
}
