use {
  crate::{errors::ErrorCode, state::*},
  anchor_lang::prelude::*,
  anchor_spl::token::{TokenAccount},
};
  
pub fn assert_issuer_token_account(
  token_account: &Account<TokenAccount>,
  token_manager: &Account<TokenManager>,
  remaining_accounts: &mut std::slice::Iter<AccountInfo>,
) -> Result<()> {
  if token_manager.receipt_mint == None {
    if token_account.owner != token_manager.issuer { return Err(error!(ErrorCode::InvalidIssuer))}
  } else {
    let receipt_token_account_info = next_account_info(remaining_accounts)?;
    let receipt_token_account = Account::<TokenAccount>::try_from(receipt_token_account_info)?;
    if !(receipt_token_account.mint == token_manager.receipt_mint.unwrap() && receipt_token_account.amount > 0) { return Err(error!(ErrorCode::InvalidMint))}
    if receipt_token_account.owner != token_account.owner { return Err(error!(ErrorCode::InvalidIssuer))}
  }
  Ok(())
}