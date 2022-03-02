use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{program::CardinalTokenManager, state::{TokenManager, TokenManagerState}}, 
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [RECEIPT_MARKER_SEED.as_bytes(), token_manager.key().as_ref()], bump = receipt_marker.bump,
        close = invalidator,
    )]
    receipt_marker: Box<Account<'info, ReceiptMarker>>,

    invalidator: Signer<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    // cpi accounts
    /// CHECK: This is not dangerous because we don't read or write from this account
    receipt_token_manager_token_account: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    receipt_marker_token_account: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    receipt_mint: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    recipient_token_account: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    token_program: UncheckedAccount<'info>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    let token_manager_key = ctx.accounts.token_manager.key();
    let receipt_marker_seeds = &[RECEIPT_MARKER_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.receipt_marker.bump]];
    let receipt_marker_signer = &[&receipt_marker_seeds[..]];

    // must either be empty or state of initialized meaning it is getting re-issued already
    if !ctx.accounts.token_manager.data_is_empty() {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state != TokenManagerState::Initialized as u8 {
            return Err(error!(ErrorCode::InvalidTokenManager))
        }
    }

    // invalidate
    let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        mint: ctx.accounts.receipt_mint.to_account_info(),
        recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
        invalidator: ctx.accounts.receipt_marker.to_account_info(),
        collector: ctx.accounts.invalidator.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec())
        .with_signer(receipt_marker_signer);
    cardinal_token_manager::cpi::invalidate(cpi_ctx)?;
    return Ok(())
}