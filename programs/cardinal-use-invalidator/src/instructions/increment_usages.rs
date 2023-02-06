use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use cardinal_token_manager::state::TokenManager;

#[derive(Accounts)]
#[instruction(num_usages: u64)]
pub struct IncrementUsagesCtx<'info> {
    #[account(constraint = token_manager.key() == use_invalidator.token_manager @ ErrorCode::InvalidUseInvalidator)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = use_invalidator.total_usages.is_none() || use_invalidator.usages.checked_add(num_usages).expect("Add error") <= use_invalidator.total_usages.expect("No usage limit") @ ErrorCode::InsufficientUsages)]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(constraint = token_manager.recipient_token_account == recipient_token_account.key() @ ErrorCode::InvalidTokenAccount)]
    recipient_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        constraint = (use_invalidator.use_authority.is_some() && user.key() == use_invalidator.use_authority.unwrap())
        || (use_invalidator.use_authority.is_none() && user.key() == recipient_token_account.owner)
        @ ErrorCode::InvalidUser
    )]
    user: Signer<'info>,
}

pub fn handler(ctx: Context<IncrementUsagesCtx>, num_usages: u64) -> Result<()> {
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    use_invalidator.usages = use_invalidator.usages.checked_add(num_usages).expect("Add error");
    Ok(())
}
