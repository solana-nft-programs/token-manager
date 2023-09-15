use anchor_spl::token::Approve;
use anchor_spl::token::FreezeAccount;
use anchor_spl::token::Mint;
use anchor_spl::token::ThawAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::{self};
use mpl_token_metadata::utils::assert_derivation;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct DelegateCtx<'info> {
    #[account(mut, constraint = token_manager.kind == TokenManagerKind::Permissioned as u8 && token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [MINT_MANAGER_SEED.as_bytes(), mint.key().as_ref()], bump)]
    mint_manager: Box<Account<'info, MintManager>>,

    #[account(mut)]
    recipient: Signer<'info>,
    #[account(mut, constraint =
        recipient_token_account.owner == recipient.key()
        && recipient_token_account.mint == token_manager.mint
        && recipient_token_account.key() == token_manager.recipient_token_account.key()
        && recipient_token_account.delegate.is_none()
        @ ErrorCode::InvalidRecipientTokenAccount
    )]
    recipient_token_account: Box<Account<'info, TokenAccount>>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<DelegateCtx>) -> Result<()> {
    let mint = ctx.accounts.mint.key();
    let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
    let bump_seed = assert_derivation(ctx.program_id, &ctx.accounts.mint_manager.to_account_info(), path)?;
    let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[bump_seed]];
    let mint_manager_signer = &[&mint_manager_seeds[..]];

    let cpi_accounts = ThawAccount {
        account: ctx.accounts.recipient_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.mint_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
    token::thaw_account(cpi_context)?;

    let cpi_accounts = Approve {
        to: ctx.accounts.recipient_token_account.to_account_info(),
        delegate: ctx.accounts.token_manager.to_account_info(),
        authority: ctx.accounts.recipient.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::approve(cpi_context, ctx.accounts.token_manager.amount)?;

    let cpi_accounts = FreezeAccount {
        account: ctx.accounts.recipient_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.mint_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
    token::freeze_account(cpi_context)?;

    Ok(())
}
