use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use cardinal_token_manager::state::TokenManager;
use cardinal_token_manager::state::TokenManagerState;

use cardinal_token_manager::program::CardinalTokenManager;
use solana_program::sysvar::{self};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateListingIx {
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: CreateListingIx)]
pub struct CreateListingCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = LISTING_SIZE,
        seeds = [LISTING_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    listing: Box<Account<'info, Listing>>,

    #[account(constraint = transfer_authority.key() == token_manager.transfer_authority.expect("No transfer authority for token manager") @ ErrorCode::InvalidTransferAuthority)]
    transfer_authority: Box<Account<'info, TransferAuthority>>,
    marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut, constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    /// CHECK: This is not dangerous because this account is not read in this instruction
    mint: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because this account is not read in this instruction
    #[account(mut)]
    mint_manager: UncheckedAccount<'info>,

    #[account(mut, constraint = lister_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidListerMintTokenAccount)]
    lister_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = lister.key() == lister_token_account.owner @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because the ID is checked with instructions sysvar
    #[account(address = sysvar::instructions::id())]
    instructions: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<CreateListingCtx>, ix: CreateListingIx) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.bump = *ctx.bumps.get("listing").unwrap();
    listing.lister = ctx.accounts.lister.key();
    listing.token_manager = ctx.accounts.token_manager.key();
    listing.marketplace = ctx.accounts.marketplace.key();
    // payment
    listing.payment_amount = ix.payment_amount;
    listing.payment_mint = ix.payment_mint;

    if ctx.accounts.marketplace.payment_mints.is_some() && !ctx.accounts.marketplace.payment_mints.as_ref().unwrap().contains(&ix.payment_mint) {
        return Err(error!(ErrorCode::InvalidPaymentMint));
    }

    if ctx.accounts.transfer_authority.allowed_marketplaces.is_some() && !ctx.accounts.transfer_authority.allowed_marketplaces.as_ref().unwrap().contains(&ctx.accounts.marketplace.key()) {
        return Err(error!(ErrorCode::MarketplaceNotAllowed));
    }

    if ctx.accounts.lister_token_account.delegate.is_none() {
        let cpi_accounts = cardinal_token_manager::cpi::accounts::DelegateCtx {
            token_manager: ctx.accounts.token_manager.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            mint_manager: ctx.accounts.mint_manager.to_account_info(),
            recipient: ctx.accounts.lister.to_account_info(),
            recipient_token_account: ctx.accounts.lister_token_account.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts);
        cardinal_token_manager::cpi::delegate(cpi_ctx)?;
    } else if ctx.accounts.lister_token_account.delegate.expect("Invalid delegate") != ctx.accounts.token_manager.key()
        || ctx.accounts.lister_token_account.delegated_amount != ctx.accounts.token_manager.amount
    {
        return Err(error!(ErrorCode::TokenNotDelegated));
    }

    Ok(())
}
