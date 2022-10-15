use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct UpdateTransferReceiptCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.transfer_authority.expect("No transfer authority") == transfer_authority.key()
        @ ErrorCode::InvalidTransferAuthority
    )]
    transfer_authority: Signer<'info>,

    #[account(mut, constraint = transfer_receipt.token_manager == token_manager.key() @ ErrorCode::InvalidTransferReceipt)]
    transfer_receipt: Box<Account<'info, TransferReceipt>>,
}

pub fn handler(ctx: Context<UpdateTransferReceiptCtx>, target: Pubkey) -> Result<()> {
    let transfer_receipt = &mut ctx.accounts.transfer_receipt;
    transfer_receipt.mint_count = ctx.accounts.token_manager.count;
    transfer_receipt.token_manager = ctx.accounts.token_manager.key();
    transfer_receipt.target = target;

    Ok(())
}
