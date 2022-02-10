use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{program::CardinalTokenManager, state::{TokenManager, TokenManagerState}}, 
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [RECEIPT_MARKER_SEED.as_bytes(), token_manager.key().as_ref()], bump = receipt_marker.bump,
    )]
    receipt_marker: Box<Account<'info, ReceiptMarker>>,

    user: Signer<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    // cpi accounts
    receipt_token_manager_token_account: UncheckedAccount<'info>,
    receipt_marker_token_account: UncheckedAccount<'info>,
    receipt_mint: UncheckedAccount<'info>,
    recipient_token_account: UncheckedAccount<'info>,
    token_program: UncheckedAccount<'info>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
    let receipt_marker = &mut ctx.accounts.receipt_marker;
    receipt_marker.receipt_manager = None;

    let token_manager_key = ctx.accounts.token_manager.key();
    let receipt_marker_seeds = &[RECEIPT_MARKER_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.receipt_marker.bump]];
    let receipt_marker_signer = &[&receipt_marker_seeds[..]];

    // must either be empty or state of initialized meaning it is getting re-issued already
    if !ctx.accounts.token_manager.data_is_empty() {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state != TokenManagerState::Initialized as u8 {
            return Err(ErrorCode::InvalidTokenManager.into())
        }
    }

    // invalidate
    let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        mint: ctx.accounts.receipt_mint.to_account_info(),
        recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
        issuer_token_account: ctx.accounts.receipt_marker_token_account.to_account_info(),
        invalidator: ctx.accounts.receipt_marker.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts)
        .with_remaining_accounts(ctx.remaining_accounts.to_vec())
        .with_signer(receipt_marker_signer);
    cardinal_token_manager::cpi::invalidate(cpi_ctx)?;
    return Ok(())
}