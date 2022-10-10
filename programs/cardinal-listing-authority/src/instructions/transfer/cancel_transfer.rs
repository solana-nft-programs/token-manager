use anchor_spl::token::TokenAccount;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};
#[derive(Accounts)]
pub struct CancelTransferCtx<'info> {
    #[account(mut, close = holder, constraint = transfer.token_manager == token_manager.key() @ ErrorCode::InvalidTransfer)]
    transfer: Box<Account<'info, Transfer>>,

    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint = holder_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidHolderMintTokenAccount)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = holder.key() == holder_token_account.owner @ ErrorCode::InvalidHolder)]
    holder: Signer<'info>,
}

pub fn handler(_ctx: Context<CancelTransferCtx>) -> Result<()> {
    Ok(())
}
