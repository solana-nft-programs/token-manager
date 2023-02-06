use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct CreateTransferReceiptCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.transfer_authority.expect("No transfer authority") == transfer_authority.key()
        @ ErrorCode::InvalidTransferAuthority
    )]
    transfer_authority: Signer<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [TRANSFER_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref()], bump,
        space = TRANSFER_RECEIPT_SIZE,
    )]
    transfer_receipt: Box<Account<'info, TransferReceipt>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateTransferReceiptCtx>, target: Pubkey) -> Result<()> {
    let transfer_receipt = &mut ctx.accounts.transfer_receipt;
    transfer_receipt.mint_count = ctx.accounts.token_manager.count;
    transfer_receipt.token_manager = ctx.accounts.token_manager.key();
    transfer_receipt.target = target;
    Ok(())
}
