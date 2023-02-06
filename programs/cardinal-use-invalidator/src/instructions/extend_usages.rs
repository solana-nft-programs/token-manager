use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};
use cardinal_payment_manager::program::CardinalPaymentManager;
use cardinal_token_manager::state::TokenManager;
use cardinal_token_manager::state::TokenManagerState;
use cardinal_token_manager::utils::assert_payment_token_account;

#[derive(Accounts)]
pub struct ExtendUsagesCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = use_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidUseInvalidator)]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, constraint = payment_manager.key() == use_invalidator.payment_manager @ ErrorCode::InvalidPaymentManager)]
    payment_manager: UncheckedAccount<'info>,

    #[account(mut, constraint = payment_token_account.mint == use_invalidator.extension_payment_mint.expect("No extension mint") @ ErrorCode::InvalidPaymentTokenAccount)]
    payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = fee_collector_token_account.mint == use_invalidator.extension_payment_mint.unwrap() @ ErrorCode::InvalidPaymentMint)]
    fee_collector_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
        payer_token_account.owner == payer.key()
        && payer_token_account.mint == use_invalidator.extension_payment_mint.expect("No extension mint")
        @ ErrorCode::InvalidPayerTokenAccount
    )]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
    cardinal_payment_manager: Program<'info, CardinalPaymentManager>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ExtendUsagesCtx<'info>>, usages_to_add: u64) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    assert_payment_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;

    let token_manager = &mut ctx.accounts.token_manager;
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    if use_invalidator.extension_payment_amount.is_none() || use_invalidator.extension_usages.is_none() || use_invalidator.extension_payment_mint.is_none() || use_invalidator.total_usages.is_none() {
        return Err(error!(ErrorCode::InvalidUseInvalidator));
    }

    let price_to_pay = usages_to_add
        .checked_mul(use_invalidator.extension_payment_amount.expect("No extension amount"))
        .expect("Multiplication error")
        .checked_div(use_invalidator.extension_usages.expect("No extension duration"))
        .expect("Division error");

    let new_total_usages = Some(use_invalidator.total_usages.unwrap().checked_add(usages_to_add).expect("Add error"));
    if new_total_usages > use_invalidator.max_usages {
        return Err(error!(ErrorCode::MaxUsagesReached));
    }

    if ctx.accounts.payment_manager.owner.key() == ctx.accounts.cardinal_payment_manager.key() {
        let payment_mint_info = next_account_info(remaining_accs)?;
        let payment_mint = Account::<Mint>::try_from(payment_mint_info)?;
        if use_invalidator.extension_payment_mint.unwrap() != payment_mint.key() {
            return Err(error!(ErrorCode::InvalidPaymentMint));
        }

        let mint_info = next_account_info(remaining_accs)?;
        let mint = Account::<Mint>::try_from(mint_info)?;
        if token_manager.mint != mint.key() {
            return Err(error!(ErrorCode::InvalidMint));
        }
        let mint_metadata_info = next_account_info(remaining_accs)?;

        let cpi_accounts = cardinal_payment_manager::cpi::accounts::HandlePaymentWithRoyaltiesCtx {
            payment_manager: ctx.accounts.payment_manager.to_account_info(),
            payer_token_account: ctx.accounts.payer_token_account.to_account_info(),
            fee_collector_token_account: ctx.accounts.fee_collector_token_account.to_account_info(),
            payment_token_account: ctx.accounts.payment_token_account.to_account_info(),
            payment_mint: payment_mint.to_account_info(),
            mint: mint.to_account_info(),
            mint_metadata: mint_metadata_info.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
        cardinal_payment_manager::cpi::handle_payment_with_royalties(cpi_ctx, price_to_pay)?;
    } else {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.payment_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, price_to_pay)?;
    }

    use_invalidator.total_usages = new_total_usages;
    Ok(())
}
