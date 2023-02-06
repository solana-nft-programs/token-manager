use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::AccountsClose;
use cardinal_token_manager::state::InvalidationType;
use cardinal_token_manager::state::TokenManager;
use cardinal_token_manager::state::TokenManagerState;

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    /// CHECK: This is not dangerous because we expect it to potentially be empty
    #[account(constraint = token_manager.key() == claim_approver.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: UncheckedAccount<'info>,

    #[account(mut)]
    claim_approver: Box<Account<'info, PaidClaimApprover>>,

    #[account(mut, constraint = collector.key() == claim_approver.collector @ ErrorCode::InvalidCollector)]
    /// CHECK: This is not dangerous because this is just the pubkey that collects the closing account lamports
    collector: UncheckedAccount<'info>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> Result<()> {
    if ctx.accounts.token_manager.data_is_empty() {
        ctx.accounts.claim_approver.close(ctx.accounts.collector.to_account_info())?;
    } else {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state == TokenManagerState::Initialized as u8 && ctx.accounts.closer.key() == token_manager.issuer {
            ctx.accounts.claim_approver.close(ctx.accounts.collector.to_account_info())?;
        }
        if token_manager.state == TokenManagerState::Invalidated as u8 && token_manager.kind != InvalidationType::Invalidate as u8 {
            ctx.accounts.claim_approver.close(ctx.accounts.collector.to_account_info())?;
        }
    }
    Ok(())
}
