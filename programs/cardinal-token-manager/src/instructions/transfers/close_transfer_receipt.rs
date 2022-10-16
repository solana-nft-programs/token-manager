use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct CloseTransferReceiptCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.transfer_authority.expect("No transfer authority") == transfer_authority.key()
        @ ErrorCode::InvalidTransferAuthority
    )]
    transfer_authority: Signer<'info>,

    #[account(mut, close = recipient, constraint = transfer_receipt.token_manager == token_manager.key() @ ErrorCode::InvalidTransferReceipt)]
    transfer_receipt: Box<Account<'info, TransferReceipt>>,
    /// CHECK: This is not dangerous because this is just the pubkey that collects the closing account lamports
    #[account(mut)]
    recipient: UncheckedAccount<'info>,
}

pub fn handler(_ctx: Context<CloseTransferReceiptCtx>) -> Result<()> {
    Ok(())
}
