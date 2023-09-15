use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use solana_nft_programs_token_manager::program::SolanaNftProgramsTokenManager;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerKind;

#[derive(Accounts)]
pub struct RemoveListingCtx<'info> {
    #[account(mut, constraint = listing.token_manager == token_manager.key() @ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, close = lister)]
    listing: Box<Account<'info, Listing>>,
    #[account(mut, constraint =
        lister_mint_token_account.amount == 1 &&
        lister_mint_token_account.mint == token_manager.mint &&
        lister_mint_token_account.owner == lister.key() @ ErrorCode::InvalidListerMintTokenAccount)]
    lister_mint_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,

    /// CHECK: This is not dangerous because this account is not read in this instruction
    mint: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because this account is not read in this instruction
    #[account(mut)]
    mint_manager: UncheckedAccount<'info>,

    solana_nft_programs_token_manager: Program<'info, SolanaNftProgramsTokenManager>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<RemoveListingCtx>) -> Result<()> {
    if ctx.accounts.lister_mint_token_account.delegate.is_some()
        && ctx.accounts.lister_mint_token_account.delegate.expect("Invalid delegate") == ctx.accounts.token_manager.key()
        && ctx.accounts.token_manager.kind == TokenManagerKind::Permissioned as u8
    {
        let cpi_accounts = solana_nft_programs_token_manager::cpi::accounts::UndelegateCtx {
            token_manager: ctx.accounts.token_manager.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_manager: ctx.accounts.mint_manager.to_account_info(),
            recipient: ctx.accounts.lister.to_account_info(),
            recipient_token_account: ctx.accounts.lister_mint_token_account.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.solana_nft_programs_token_manager.to_account_info(), cpi_accounts);
        solana_nft_programs_token_manager::cpi::undelegate(cpi_ctx)?;
    }
    Ok(())
}
