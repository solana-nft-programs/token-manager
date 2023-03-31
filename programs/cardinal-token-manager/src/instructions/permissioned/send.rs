use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::associated_token::{self};
use anchor_spl::token::FreezeAccount;
use anchor_spl::token::Mint;
use anchor_spl::token::ThawAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};
use mpl_token_metadata::utils::assert_derivation;
use solana_program::serialize_utils::read_u16;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use solana_program::sysvar::instructions::load_instruction_at_checked;
use solana_program::sysvar::{self};
use spl_associated_token_account::get_associated_token_address;

///////////// CONSTANTS /////////////
pub const ALLOWED_PROGRAMS: [&str; 1] = ["ComputeBudget111111111111111111111111111111"];

#[derive(Accounts)]
pub struct SendCtx<'info> {
    #[account(mut, constraint = token_manager.kind == TokenManagerKind::Permissioned as u8 && token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,
    #[account(mut, seeds = [MINT_MANAGER_SEED.as_bytes(), mint.key().as_ref()], bump)]
    mint_manager: Account<'info, MintManager>,

    #[account(mut)]
    recipient: Signer<'info>,
    #[account(mut, constraint =
        recipient_token_account.owner == recipient.key()
        && recipient_token_account.mint == token_manager.mint
        && recipient_token_account.key() == token_manager.recipient_token_account.key()
        @ ErrorCode::InvalidRecipientTokenAccount
    )]
    recipient_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: This is not dangerous because the account is checked in the instruction handler
    target: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because the account is checked in the instruction handler
    #[account(mut)]
    target_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,

    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because the ID is checked with instructions sysvar
    #[account(address = sysvar::instructions::id())]
    instructions: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<SendCtx>) -> Result<()> {
    // check allowed programs
    let instruction_sysvar = ctx.accounts.instructions.try_borrow_data()?;
    let mut current: usize = 0;
    let num_instructions = read_u16(&mut current, &instruction_sysvar).expect("Invalid instruction");
    for i in 0..num_instructions {
        let ix = load_instruction_at_checked(i.into(), &ctx.accounts.instructions.to_account_info()).expect("Failed to get instruction");
        if ix.program_id != *ctx.program_id && !ALLOWED_PROGRAMS.contains(&&ix.program_id.to_string()[..]) {
            return Err(error!(ErrorCode::InstructionsDisallowed));
        }
    }

    // update token manager recipient token account
    ctx.accounts.token_manager.recipient_token_account = ctx.accounts.target_token_account.key();

    // Check ATA
    let associated_token_account = get_associated_token_address(&ctx.accounts.target.key(), &ctx.accounts.mint.key());
    if associated_token_account != ctx.accounts.target_token_account.key() {
        return Err(error!(ErrorCode::InvalidTargetTokenAccount));
    }
    if ctx.accounts.target_token_account.data_is_empty() {
        let cpi_accounts = associated_token::Create {
            payer: ctx.accounts.payer.to_account_info(),
            associated_token: ctx.accounts.target_token_account.to_account_info(),
            authority: ctx.accounts.target.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        associated_token::create(cpi_context)?;
    }

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

    let cpi_accounts = Transfer {
        from: ctx.accounts.recipient_token_account.to_account_info(),
        to: ctx.accounts.target_token_account.to_account_info(),
        authority: ctx.accounts.recipient.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

    let cpi_accounts = FreezeAccount {
        account: ctx.accounts.target_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.mint_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
    token::freeze_account(cpi_context)?;

    Ok(())
}
