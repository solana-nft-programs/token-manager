use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(target: Pubkey)]
pub struct CreateClaimReceiptCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(constraint =
        token_manager.claim_approver.expect("No claim approver") == claim_approver.key()
        @ ErrorCode::InvalidIssuer
    )]
    claim_approver: Signer<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [CLAIM_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref(), target.as_ref()], bump,
        space = CLAIM_RECEIPT_SIZE,
    )]
    claim_receipt: Box<Account<'info, ClaimReceipt>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateClaimReceiptCtx>, target: Pubkey) -> Result<()> {
    let claim_receipt = &mut ctx.accounts.claim_receipt;
    claim_receipt.mint_count = ctx.accounts.token_manager.count;
    claim_receipt.token_manager = ctx.accounts.token_manager.key();
    claim_receipt.target = target;
    Ok(())
}
