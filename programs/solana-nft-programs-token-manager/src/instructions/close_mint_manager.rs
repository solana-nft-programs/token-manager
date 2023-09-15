use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::SetAuthority;
use anchor_spl::token::Token;
use anchor_spl::token::{self};
use spl_token::instruction::AuthorityType;

#[derive(Accounts)]
pub struct CloseMintManagerCtx<'info> {
    #[account(mut, constraint = mint_manager.token_managers == 0 @ ErrorCode::OutstandingTokens, close = freeze_authority)]
    pub mint_manager: Account<'info, MintManager>,
    #[account(mut, constraint = mint.freeze_authority.expect("No freeze authority") == mint_manager.key() @ ErrorCode::InvalidFreezeAuthority)]
    pub mint: Account<'info, Mint>,
    #[account(constraint = mint_manager.initializer == freeze_authority.key() @ ErrorCode::InvalidInitializer)]
    pub freeze_authority: Signer<'info>,
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CloseMintManagerCtx>) -> Result<()> {
    // get PDA seeds to sign with
    let mint = ctx.accounts.mint.key();
    let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[ctx.accounts.mint_manager.bump]];
    let mint_manager_signer = &[&mint_manager_seeds[..]];

    // set freeze authority of mint back to original
    let cpi_accounts = SetAuthority {
        account_or_mint: ctx.accounts.mint.to_account_info(),
        current_authority: ctx.accounts.mint_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
    token::set_authority(cpi_context, AuthorityType::FreezeAccount, Some(ctx.accounts.freeze_authority.key()))?;
    Ok(())
}
