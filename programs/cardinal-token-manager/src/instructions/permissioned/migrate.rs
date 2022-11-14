use std::str::FromStr;

use crate::{
    errors::ErrorCode,
    state::{MintManager, MINT_MANAGER_SEED},
};
use anchor_spl::token::{self, Mint, ThawAccount, Token, TokenAccount};
use cardinal_creator_standard::instructions::init_mint_manager;
use solana_program::program::invoke_signed;

use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Accounts)]

pub struct MigrateCtx<'info> {
    current_mint_manager: Box<Account<'info, MintManager>>,
    /// CHECK: no checks required
    #[account(mut)]
    mint_manager: UncheckedAccount<'info>,
    #[account(mut)]
    mint: Box<Account<'info, Mint>>,
    /// CHECK: no checks required
    ruleset: UncheckedAccount<'info>,

    #[account(mut)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: no checks required
    token_authority: UncheckedAccount<'info>,

    /// CHECK: no checks required
    #[account(mut)]
    ruleset_collector: UncheckedAccount<'info>,
    /// CHECK: no checks required
    #[account(mut)]
    collector: UncheckedAccount<'info>,
    /// CHECK: no checks required
    authority: UncheckedAccount<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    rent: Sysvar<'info, Rent>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because the ID is checked with instructions sysvar
    #[account(address = cardinal_creator_standard::id())]
    cardinal_creator_standard: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<MigrateCtx>) -> Result<()> {
    if ctx.accounts.payer.key() != Pubkey::from_str("gmdS6fDgVbeCCYwwvTPJRKM9bFbAgSZh6MTDUT2DcgV").unwrap() {
        return Err(error!(ErrorCode::InvalidMigrateAuthority));
    }

    let mint_manager_key = ctx.accounts.mint.key();
    let current_mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint_manager_key.as_ref(), &[ctx.accounts.current_mint_manager.bump]];
    let current_mint_manager_signer = &[&current_mint_manager_seeds[..]];

    // thaw recipient account
    let cpi_accounts = ThawAccount {
        account: ctx.accounts.holder_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.current_mint_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(current_mint_manager_signer);
    token::thaw_account(cpi_context)?;

    invoke_signed(
        &init_mint_manager(
            ctx.accounts.cardinal_creator_standard.key(),
            ctx.accounts.mint_manager.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.ruleset.key(),
            ctx.accounts.holder_token_account.key(),
            ctx.accounts.token_authority.key(),
            ctx.accounts.ruleset_collector.key(),
            ctx.accounts.collector.key(),
            ctx.accounts.authority.key(),
            ctx.accounts.payer.key(),
        ),
        &[
            ctx.accounts.mint_manager.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.ruleset.to_account_info(),
            ctx.accounts.holder_token_account.to_account_info(),
            ctx.accounts.token_authority.to_account_info(),
            ctx.accounts.ruleset_collector.to_account_info(),
            ctx.accounts.collector.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.rent.to_account_info(),
            ctx.accounts.token_program.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.cardinal_creator_standard.to_account_info(),
        ],
        current_mint_manager_signer,
    )?;

    Ok(())
}
