use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
#[instruction(bump: u8, target: Pubkey)]
pub struct CreateTransferReceiptCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint =
        token_manager.transfer_authority != None
        && token_manager.transfer_authority.unwrap() == transfer_authority.key()
        @ ErrorCode::InvalidTransferAuthority
    )]
    transfer_authority: Signer<'info>,

    #[account(
        init,
        payer = transfer_authority,
        seeds = [TRANSFER_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref(), target.key().as_ref()], bump = bump,
        space = TRANSFER_RECEIPT_SIZE,
    )]
    transfer_receipt: Box<Account<'info, TranferReceipt>>,
    system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<CreateTransferReceiptCtx>, _bump: u8, _target: Pubkey) -> ProgramResult {
    return Ok(())
}