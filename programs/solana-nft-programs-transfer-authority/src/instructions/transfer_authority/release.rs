use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use solana_nft_programs_token_manager::program::SolanaNftProgramsTokenManager;
use solana_nft_programs_token_manager::state::TokenManager;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ReleaseCtx<'info> {
    transfer_authority: Box<Account<'info, TransferAuthority>>,

    #[account(mut, constraint = token_manager.invalidators.contains(&transfer_authority.key()) @ ErrorCode::InvalidTokenManager)]
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

    solana_nft_programs_token_manager: Program<'info, SolanaNftProgramsTokenManager>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ReleaseCtx<'info>>) -> Result<()> {
    if ctx.accounts.token_manager.transfer_authority.is_none() || ctx.accounts.token_manager.transfer_authority.unwrap() != ctx.accounts.transfer_authority.key() {
        return Err(error!(ErrorCode::InvalidTransferAuthority));
    }

    let transfer_authority_seeds = &[
        TRANSFER_AUTHORITY_SEED.as_bytes(),
        ctx.accounts.transfer_authority.name.as_bytes(),
        &[ctx.accounts.transfer_authority.bump],
    ];
    let transfer_authority_signer = &[&transfer_authority_seeds[..]];

    // invalidate
    let cpi_accounts = solana_nft_programs_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        recipient_token_account: ctx.accounts.holder_token_account.to_account_info(),
        invalidator: ctx.accounts.transfer_authority.to_account_info(),
        collector: ctx.accounts.collector.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_token_manager.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec())
        .with_signer(transfer_authority_signer);
    solana_nft_programs_token_manager::cpi::invalidate(cpi_ctx)?;

    Ok(())
}
