use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::AccountsClose;
use solana_nft_programs_token_manager::state::InvalidationType;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerState;

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    /// CHECK: This is not dangerous because we expect it to potentially be empty
    #[account(constraint = token_manager.key() == time_invalidator.token_manager @ ErrorCode::InvalidTokenManager)]
    token_manager: UncheckedAccount<'info>,

    #[account(mut)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut, constraint = collector.key() == time_invalidator.collector @ ErrorCode::InvalidCollector)]
    /// CHECK: This is not dangerous because this is just the pubkey that collects the closing account lamports
    collector: UncheckedAccount<'info>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> Result<()> {
    if ctx.accounts.token_manager.data_is_empty() {
        ctx.accounts.time_invalidator.close(ctx.accounts.collector.to_account_info())?;
    } else {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state == TokenManagerState::Initialized as u8 && ctx.accounts.closer.key() == token_manager.issuer {
            ctx.accounts.time_invalidator.close(ctx.accounts.collector.to_account_info())?;
        }
        if token_manager.state == TokenManagerState::Invalidated as u8 && token_manager.kind != InvalidationType::Invalidate as u8 {
            ctx.accounts.time_invalidator.close(ctx.accounts.collector.to_account_info())?;
        }
    }
    Ok(())
}
