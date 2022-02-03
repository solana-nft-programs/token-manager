use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
#[instruction(bump: u8, target: Pubkey)]
pub struct CreateClaimReceiptCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.claim_approver != None
        && token_manager.claim_approver.unwrap() == claim_approver.key()
        @ ErrorCode::InvalidIssuer
    )]
    claim_approver: Signer<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [CLAIM_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref(), target.key().as_ref()], bump = bump,
        space = CLAIM_RECEIPT_SIZE,
    )]
    claim_receipt: Box<Account<'info, ClaimReceipt>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<CreateClaimReceiptCtx>, _bump: u8, _target: Pubkey) -> ProgramResult {
    return Ok(())
}