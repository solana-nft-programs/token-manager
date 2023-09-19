use crate::errors::ErrorCode;
use crate::state::MintManager;
use crate::state::TokenManager;
use crate::state::MINT_MANAGER_SEED;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::CloseAccount;
use anchor_spl::token::Mint;
use anchor_spl::token::ThawAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::{self};
use mpl_token_metadata::instructions::CreateMasterEditionV3;
use mpl_token_metadata::instructions::CreateMasterEditionV3InstructionArgs;
use solana_program::program::invoke_signed;

#[derive(Accounts)]
pub struct MigrateCtx<'info> {
    #[account(mut, close = collector, constraint = token_manager.kind == TokenManagerKind::Permissioned as u8 && token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManagerState)]
    mint_manager: Box<Account<'info, MintManager>>,
    #[account(mut, close = collector)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint =
        token_manager_token_account.owner == token_manager.key()
        && token_manager_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidTokenManagerTokenAccount
    )]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = token_manager.mint == mint.key() @ ErrorCode::InvalidMint )]
    mint: Box<Account<'info, Mint>>,
    /// CHECK: no checks required
    #[account(mut)]
    mint_metadata: UncheckedAccount<'info>,
    /// CHECK: no checks required
    #[account(mut)]
    mint_edition: UncheckedAccount<'info>,

    #[account(mut)]
    holder_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: no checks required
    #[account(constraint = token_manager.invalidators.contains(&invalidator.key()) @ ErrorCode::InvalidInvalidator)]
    invalidator: Signer<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    /// CHECK: no checks required
    #[account(mut)]
    collector: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because the ID is checked with instructions sysvar
    #[account(address = mpl_token_metadata::ID)]
    mpl_token_metadata: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<MigrateCtx>) -> Result<()> {
    let mint_manager_key = ctx.accounts.mint.key();
    let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint_manager_key.as_ref(), &[ctx.accounts.mint_manager.bump]];
    let mint_manager_signer = &[&mint_manager_seeds[..]];

    // thaw recipient account
    let cpi_accounts = ThawAccount {
        account: ctx.accounts.holder_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.mint_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
    token::thaw_account(cpi_context)?;

    invoke_signed(
        &CreateMasterEditionV3 {
            edition: ctx.accounts.mint_edition.key(),
            mint: ctx.accounts.mint.key(),
            update_authority: ctx.accounts.mint_manager.key(),
            mint_authority: ctx.accounts.mint_manager.key(),
            payer: ctx.accounts.payer.key(),
            metadata: ctx.accounts.mint_metadata.key(),
            token_program: ctx.accounts.token_program.key(),
            system_program: ctx.accounts.system_program.key(),
            rent: None,
        }
        .instruction(CreateMasterEditionV3InstructionArgs { max_supply: None }),
        &[
            ctx.accounts.mpl_token_metadata.to_account_info(),
            ctx.accounts.mint_edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.invalidator.to_account_info(),
            ctx.accounts.mint_manager.to_account_info(),
            ctx.accounts.mint_metadata.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.mpl_token_metadata.to_account_info(),
        ],
        mint_manager_signer,
    )?;

    let mint = ctx.accounts.token_manager.mint;
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    Ok(())
}
