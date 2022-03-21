use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
};

use anchor_spl::{
    token::{self, Mint, Token, TokenAccount},
    associated_token::{AssociatedToken}
};

use cardinal_token_manager::{
    self,
    program::CardinalTokenManager,
    state::{TokenManager, TokenManagerState, TokenManagerKind, InvalidationType, TOKEN_MANAGER_SEED,},
    cpi::accounts::{IssueCtx, ClaimCtx},
    instructions::{IssueIx}
};

#[derive(Accounts)]
pub struct StakeCtx<'info> {
    #[account(mut)]
    stake_entry: Box<Account<'info, StakeEntry>>,

    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint = original_mint.key() == stake_entry.original_mint @ ErrorCode::InvalidOriginalMint)]
    original_mint: Box<Account<'info, Mint>>,
    #[account(mut, constraint = mint.key() == stake_entry.mint @ ErrorCode::InvalidTokenManagerMint)]
    mint: Box<Account<'info, Mint>>,

    // stake_entry token accounts
    #[account(mut, constraint =
        stake_entry_original_mint_token_account.amount == 0
        && stake_entry_original_mint_token_account.mint == stake_entry.original_mint
        && stake_entry_original_mint_token_account.owner == stake_entry.key()
        @ ErrorCode::InvalidStakeEntryOriginalMintTokenAccount)]
    stake_entry_original_mint_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint =
        stake_entry_token_manager_mint_token_account.amount > 0
        && stake_entry_token_manager_mint_token_account.mint == stake_entry.mint
        && stake_entry_token_manager_mint_token_account.owner == stake_entry.key()
        @ ErrorCode::InvalidStakeEntryTokenManagerMintTokenAccount)]
    stake_entry_token_manager_mint_token_account: Box<Account<'info, TokenAccount>>,

    // user
    #[account(mut)]
    user: Signer<'info>,
    #[account(mut, constraint =
        user_original_mint_token_account.amount > 0
        && user_original_mint_token_account.mint == original_mint.key()
        && user_original_mint_token_account.owner == user.key()
        @ ErrorCode::InvalidUserOriginalMintTokenAccount)]
    user_original_mint_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint =
        user_token_manager_mint_token_account.amount == 0
        && user_token_manager_mint_token_account.mint == mint.key()
        && user_token_manager_mint_token_account.owner == user.key()
        @ ErrorCode::InvalidUserTokenManagerMintTokenAccount)]
    user_token_manager_mint_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,

    // programs
    token_program: Program<'info, Token>,
    token_manager_program: Program<'info, CardinalTokenManager>,
    associated_token: Program<'info, AssociatedToken>,
    rent: Sysvar<'info, Rent>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<StakeCtx>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.state = TokenManagerState::Claimed as u8;
    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    let mint = token_manager.mint;
    let token_manager_seed = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seed[..]];

    // transfer original
    let cpi_accounts = token::Transfer {
        from: ctx.accounts.user_original_mint_token_account.to_account_info(),
        to: ctx.accounts.stake_entry_original_mint_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, 1)?;

    // token manager issue
    let token_manager_program = ctx.accounts.token_manager.to_account_info();
    let cpi_accounts = IssueCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        issuer: ctx.accounts.stake_entry.to_account_info(),
        issuer_token_account: ctx.accounts.stake_entry_token_manager_mint_token_account.to_account_info(),
        payer: ctx.accounts.user.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let issue_ix = IssueIx{
        amount: 1,
        kind: TokenManagerKind::Managed as u8,
        invalidation_type: InvalidationType::Return as u8
    };
    let cpi_ctx = CpiContext::new(token_manager_program, cpi_accounts).with_signer(token_manager_signer);
    cardinal_token_manager::cpi::issue(cpi_ctx, issue_ix)?;

    // token manager claim
    let token_manager_program = ctx.accounts.token_manager_program.to_account_info();
    let cpi_accounts = ClaimCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        recipient: ctx.accounts.user.to_account_info(),
        recipient_token_account: ctx.accounts.user_token_manager_mint_token_account.to_account_info(),
        token_program: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(token_manager_program, cpi_accounts);
    cardinal_token_manager::cpi::claim(cpi_ctx)?;

    return Ok(())
}