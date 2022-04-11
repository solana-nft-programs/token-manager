use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
#[instruction(target: Pubkey)]
pub struct CreateTransferReceiptCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint =
        token_manager.transfer_authority.expect("No transfer authority") == transfer_authority.key()
        @ ErrorCode::InvalidTransferAuthority
    )]
    transfer_authority: Signer<'info>,

    #[account(
        init,
        payer = transfer_authority,
        seeds = [TRANSFER_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref(), target.as_ref()], bump,
        space = TRANSFER_RECEIPT_SIZE,
    )]
    transfer_receipt: Box<Account<'info, TranferReceipt>>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateTransferReceiptCtx>, target: Pubkey) -> Result<()> {
    let transfer_receipt = &mut ctx.accounts.transfer_receipt;
    transfer_receipt.mint_count = ctx.accounts.token_manager.count;
    transfer_receipt.token_manager = ctx.accounts.token_manager.key();
    transfer_receipt.target = target;
    Ok(())
}
