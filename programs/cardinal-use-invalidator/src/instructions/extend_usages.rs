use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount, Transfer},
    cardinal_payment_manager::{program::CardinalPaymentManager, state::PaymentManager},
    cardinal_token_manager::{
        state::{assert_payment_manager, TokenManager, TokenManagerState},
        utils::assert_payment_token_account,
    },
};

#[derive(Accounts)]
pub struct ExtendUsagesCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = use_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidUseInvalidator)]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut, constraint = payment_token_account.mint == use_invalidator.extension_payment_mint.expect("No extension mint") @ ErrorCode::InvalidPaymentTokenAccount)]
    payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint =
        payment_manager_token_account.mint == use_invalidator.extension_payment_mint.expect("No extension mint")
        && payment_manager_token_account.owner == use_invalidator.payment_manager
        && assert_payment_manager(&payment_manager_token_account.owner)
        @ ErrorCode::InvalidPaymentManagerTokenAccount
    )]
    payment_manager_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
        payer_token_account.owner == payer.key()
        && payer_token_account.mint == use_invalidator.extension_payment_mint.expect("No extension mint")
        @ ErrorCode::InvalidPayerTokenAccount
    )]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ExtendUsagesCtx<'info>>, payment_amount: u64) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    assert_payment_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;

    let use_invalidator = &mut ctx.accounts.use_invalidator;
    if use_invalidator.extension_payment_amount == None || use_invalidator.extension_usages == None || use_invalidator.extension_payment_mint == None || use_invalidator.total_usages == None {
        return Err(error!(ErrorCode::InvalidUseInvalidator));
    }

    if payment_amount
        .checked_rem(use_invalidator.extension_payment_amount.expect("No extension amount"))
        .expect("Remainder error")
        != 0
    {
        return Err(error!(ErrorCode::InvalidExtensionAmount));
    }
    // floors any u64 decimals
    let usages_to_add = payment_amount
        .checked_mul(use_invalidator.extension_usages.expect("No extension mint"))
        .expect("Multiplication error")
        .checked_div(use_invalidator.extension_payment_amount.expect("No extension amount"))
        .expect("Division error");
    let new_total_usages = Some(use_invalidator.total_usages.unwrap().checked_add(usages_to_add).expect("Add error"));
    if new_total_usages > use_invalidator.max_usages {
        return Err(error!(ErrorCode::MaxUsagesReached));
    }

    if ctx.accounts.payment_manager_token_account.owner.key() == CardinalPaymentManager::id() {
        // call payment manager
        let payment_manager_info = next_account_info(remaining_accs)?;
        let payment_manager = Account::<PaymentManager>::try_from(payment_manager_info)?;
        let cardinal_payment_manager_info = next_account_info(remaining_accs)?;
        if cardinal_payment_manager_info.key() != CardinalPaymentManager::id() {
            return Err(error!(ErrorCode::InvalidPaymentManagerProgram));
        }

        let cpi_accounts = cardinal_payment_manager::cpi::accounts::ManagePaymentCtx {
            payment_manager: payment_manager.to_account_info(),
            payer_token_account: ctx.accounts.payer_token_account.to_account_info(),
            collector_token_account: ctx.accounts.payment_manager_token_account.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(cardinal_payment_manager_info.to_account_info(), cpi_accounts);
        cardinal_payment_manager::cpi::manage_payment(cpi_ctx, payment_amount)?;
    } else {
        // backwards compatibility no feeds transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.payment_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, payment_amount)?;
    }

    use_invalidator.total_usages = new_total_usages;
    Ok(())
}
