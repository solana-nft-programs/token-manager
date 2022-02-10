use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct RemoveCtx<'info> {
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        close = closer,
        constraint = receipt_slot.token_manager == token_manager.key() @ ErrorCode::InvalidTokenManager
    )]
    receipt_slot: Box<Account<'info, ReceiptSlot>>,

    #[account(
        mut,
        close = closer,
        seeds = [RECEIPT_MARKER_SEED.as_bytes(), token_manager.key().as_ref()], bump = receipt_marker.bump,
    )]
    receipt_marker: Box<Account<'info, ReceiptMarker>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<RemoveCtx>) -> ProgramResult {
    // must either be empty or state of initialized meaning it is getting re-issued already
    if !ctx.accounts.token_manager.data_is_empty() {
        let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
        if token_manager.state != TokenManagerState::Initialized as u8 {
            return Err(ErrorCode::InvalidTokenManager.into())
        }
    }
    return Ok(())
}