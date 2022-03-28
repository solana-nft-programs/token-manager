use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount, Transfer},
    cardinal_token_manager::{
        state::{assert_payment_manager, TokenManager, TokenManagerState, FEE_SCALE, PROVIDER_FEE, RECIPIENT_FEE},
        utils::assert_payment_token_account,
    },
};

#[derive(Accounts)]
pub struct ExtendExpirationCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = time_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidTimeInvalidator)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut, constraint = payment_token_account.mint == time_invalidator.extension_payment_mint.unwrap() @ ErrorCode::InvalidPaymentTokenAccount)]
    payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = payment_manager_token_account.mint == time_invalidator.extension_payment_mint.unwrap() && assert_payment_manager(&payment_manager_token_account.owner) @ ErrorCode::InvalidPaymentManagerTokenAccount)]
    payment_manager_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
      payer_token_account.owner == payer.key()
      && payer_token_account.mint == time_invalidator.extension_payment_mint.unwrap()
      @ ErrorCode::InvalidPayerTokenAccount
  )]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ExtendExpirationCtx>, payment_amount: u64) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    assert_payment_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;

    let time_invalidator = &mut ctx.accounts.time_invalidator;
    if time_invalidator.extension_payment_amount == None || time_invalidator.extension_duration_seconds == None || time_invalidator.extension_payment_mint == None {
        return Err(error!(ErrorCode::InvalidTimeInvalidator));
    }

    let time_to_add = payment_amount
        .checked_mul(time_invalidator.extension_duration_seconds.unwrap())
        .unwrap()
        .checked_div(time_invalidator.extension_payment_amount.unwrap())
        .unwrap();

    if time_invalidator.disable_partial_extension != None && time_invalidator.disable_partial_extension.unwrap() && time_to_add % time_invalidator.extension_duration_seconds.unwrap() != 0 {
        return Err(error!(ErrorCode::InvalidExtensionAmount));
    }

    let mut expiration = ctx.accounts.token_manager.state_changed_at.checked_add(time_invalidator.duration_seconds.unwrap()).unwrap();
    if time_invalidator.expiration != None {
        expiration = time_invalidator.expiration.unwrap();
    }
    let new_expiration = Some(expiration + time_to_add as i64);

    if time_invalidator.max_expiration != None && new_expiration > time_invalidator.max_expiration {
        return Err(error!(ErrorCode::InvalidExtendExpiration));
    }

    let provider_fee = time_invalidator.extension_payment_amount.unwrap() * (PROVIDER_FEE / FEE_SCALE);
    let recipient_fee = time_invalidator.extension_payment_amount.unwrap() * (RECIPIENT_FEE / FEE_SCALE);
    if provider_fee.checked_add(recipient_fee).unwrap() > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.payment_manager_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, provider_fee.checked_add(recipient_fee).unwrap())?;
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.payment_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, payment_amount.checked_sub(recipient_fee).unwrap())?;

    time_invalidator.expiration = new_expiration;
    Ok(())
}
