use {
  crate::{errors::ErrorCode, state::*},
  anchor_lang::prelude::*,
  anchor_spl::token::{self, Token, TokenAccount, Transfer},
  cardinal_token_manager::{state::{TokenManager, TokenManagerState}, utils::assert_issuer_token_account},
};

#[derive(Accounts)]
pub struct ExtendExpirationCtx<'info> {
  #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
  token_manager: Box<Account<'info, TokenManager>>,

  #[account(mut, constraint = time_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidTimeInvalidator)]
  time_invalidator: Box<Account<'info, TimeInvalidator>>,

  #[account(mut, constraint = payment_token_account.mint == time_invalidator.payment_mint.unwrap() @ ErrorCode::InvalidPaymentTokenAccount)]
  payment_token_account: Box<Account<'info, TokenAccount>>,

  #[account(mut)]
  payer: Signer<'info>,
  #[account(mut, constraint =
      payer_token_account.owner == payer.key()
      && payer_token_account.mint == time_invalidator.payment_mint.unwrap()
      @ ErrorCode::InvalidPayerTokenAccount
  )]
  payer_token_account: Box<Account<'info, TokenAccount>>,

  token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ExtendExpirationCtx>, payment_amount: u64) -> Result<()> {
  let remaining_accs = &mut ctx.remaining_accounts.iter();
  assert_issuer_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;
  // if ctx.accounts.token_manager.receipt_mint == None {
  //   if ctx.accounts.payment_token_account.owner != ctx.accounts.token_manager.issuer { return Err(error!(ErrorCode::InvalidPaymentTokenAccount))}
  // } else {
  //     let remaining_accs = &mut ctx.remaining_accounts.iter();
  //     let receipt_token_account_info = next_account_info(remaining_accs)?;
  //     let receipt_token_account = Account::<TokenAccount>::try_from(receipt_token_account_info)?;
  //     if !(receipt_token_account.mint == ctx.accounts.token_manager.receipt_mint.unwrap() && receipt_token_account.amount > 0) { return Err(error!(ErrorCode::InvalidPaymentTokenAccount))}
  //     if receipt_token_account.owner != ctx.accounts.payment_token_account.owner { return Err(error!(ErrorCode::InvalidPaymentTokenAccount))}
  // }

  let time_invalidator = &mut ctx.accounts.time_invalidator;
  if time_invalidator.extension_payment_amount == None
    || time_invalidator.extension_duration_seconds == None
    || time_invalidator.payment_mint == None
  {
    return Err(error!(ErrorCode::InvalidTimeInvalidator));
  }

  let time_to_add = payment_amount * time_invalidator.extension_duration_seconds.unwrap()
    / time_invalidator.extension_payment_amount.unwrap();

  if time_invalidator.disable_partial_extension != None && time_invalidator.disable_partial_extension.unwrap() == true {
    if time_to_add % time_invalidator.extension_duration_seconds.unwrap() != 0 {
      return Err(error!(ErrorCode::InvalidExtensionAmount));
    }
  }

  let mut expiration = ctx.accounts.token_manager.state_changed_at + time_invalidator.duration_seconds.unwrap();
  if time_invalidator.expiration != None {
    expiration = time_invalidator.expiration.unwrap();
  }
  let new_expiration = Some(expiration + time_to_add as i64);
  
  if time_invalidator.max_expiration != None && new_expiration > time_invalidator.max_expiration {
    return Err(error!(ErrorCode::InvalidExtendExpiration));
  }

  let cpi_accounts = Transfer {
    from: ctx.accounts.payer_token_account.to_account_info(),
    to: ctx.accounts.payment_token_account.to_account_info(),
    authority: ctx.accounts.payer.to_account_info(),
  };

  let cpi_program = ctx.accounts.token_program.to_account_info();
  let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
  token::transfer(cpi_context, payment_amount)?;

  time_invalidator.expiration = new_expiration;
  return Ok(());
}
