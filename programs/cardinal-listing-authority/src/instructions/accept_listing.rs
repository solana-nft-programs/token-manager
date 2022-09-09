use anchor_spl::token::TokenAccount;
use cardinal_token_manager::{program::CardinalTokenManager, state::TokenManager};

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::{prelude::*, AccountsClose},
    anchor_spl::token::Token,
    cardinal_payment_manager::program::CardinalPaymentManager,
};

#[derive(AnchorSerialize, AnchorDeserialize, Accounts)]
pub struct AcceptListingCtx<'info> {
    #[account(mut)]
    listing_authority: Box<Account<'info, ListingAuthority>>,
    #[account(mut)]
    transfer_receipt: UncheckedAccount<'info>,

    #[account(mut)]
    listing: Box<Account<'info, Listing>>,
    #[account(constraint =
        lister_payment_token_account.mint == listing.payment_mint &&
        lister_payment_token_account.owner == listing.lister @ ErrorCode::InvalidListerPaymentTokenAccount)]
    lister_payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(constraint =
        lister_mint_token_account.mint == token_manager.mint &&
        lister_mint_token_account.owner == lister.key() @ ErrorCode::InvalidListerMintTokenAccount)]
    lister_mint_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: UncheckedAccount<'info>,

    #[account(constraint =
        buyer_payment_token_account.mint == listing.payment_mint &&
        buyer_payment_token_account.amount == listing.payment_amount &&
        buyer_payment_token_account.owner == buyer.key() @ ErrorCode::InvalidBuyerPaymentTokenAccount)]
    buyer_payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(constraint =
        buyer_payment_token_account.mint == token_manager.mint &&
        buyer_payment_token_account.owner == buyer.key() @ ErrorCode::InvalidBuyerMintTokenAccount)]
    buyer_mint_token_account: Box<Account<'info, TokenAccount>>,
    buyer: Signer<'info>,

    #[account(mut, constraint = marketplace.key() == listing.marketplace @ ErrorCode::InvalidMarketplace)]
    marketplace: Box<Account<'info, Marketplace>>,
    #[account(mut, constraint = token_manager.key() == listing.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: UncheckedAccount<'info>,
    mint_metadata_info: UncheckedAccount<'info>,

    // payment accounts
    #[account(mut, constraint = payment_manager.key() == marketplace.payment_manager @ ErrorCode::InvalidPaymentManager)]
    payment_manager: UncheckedAccount<'info>,
    #[account(mut, constraint = payment_mint.key() == listing.payment_mint @ ErrorCode::InvalidPaymentMint)]
    payment_mint: UncheckedAccount<'info>,
    #[account(mut)]
    fee_collector_token_account: UncheckedAccount<'info>,

    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    cardinal_payment_manager: Program<'info, CardinalPaymentManager>,
    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    system_program: Program<'info, System>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, AcceptListingCtx<'info>>) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();

    let cpi_accounts = cardinal_payment_manager::cpi::accounts::HandlePaymentWithRoyaltiesCtx {
        payment_manager: ctx.accounts.payment_manager.to_account_info(),
        payer_token_account: ctx.accounts.buyer_payment_token_account.to_account_info(),
        fee_collector_token_account: ctx.accounts.fee_collector_token_account.to_account_info(),
        payment_token_account: ctx.accounts.lister_payment_token_account.to_account_info(),
        payment_mint: ctx.accounts.payment_mint.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        mint_metadata: ctx.accounts.mint_metadata_info.to_account_info(),
        payer: ctx.accounts.buyer.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
    cardinal_payment_manager::cpi::handle_payment_with_royalties(cpi_ctx, ctx.accounts.listing.payment_amount)?;

    let transfer_authority_seeds = &[
        LISTING_AUTHORITY_SEED.as_bytes(),
        ctx.accounts.listing_authority.name.as_bytes(),
        &[ctx.accounts.listing_authority.bump],
    ];
    let transfer_authority_signer = &[&transfer_authority_seeds[..]];

    // approve
    let cpi_accounts = cardinal_token_manager::cpi::accounts::CreateTransferReceiptCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        transfer_authority: ctx.accounts.listing_authority.to_account_info(),
        transfer_receipt: ctx.accounts.transfer_receipt.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(transfer_authority_signer);
    cardinal_token_manager::cpi::create_transfer_receipt(cpi_ctx, ctx.accounts.buyer.key())?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::TransferCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        current_holder_token_account: ctx.accounts.lister_mint_token_account.to_account_info(),
        recipient: ctx.accounts.buyer.to_account_info(),
        recipient_token_account: ctx.accounts.buyer_mint_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
    cardinal_token_manager::cpi::transfer(cpi_ctx)?;

    ctx.accounts.listing.close(ctx.accounts.lister.to_account_info())?;

    Ok(())
}
