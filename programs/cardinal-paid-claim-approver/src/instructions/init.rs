use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::TokenManager},
    cardinal_payment_manager::{state::PaymentManager},
};

#[derive(Accounts)]
#[instruction(bump: u8, payment_amount: u64)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.payment_manager != None && token_manager.payment_manager.unwrap() == payment_manager.key() @ ErrorCode::InvalidPaymentManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(
        init,
        payer = payer,
        space = PAID_CLAIM_APPROVER_SIZE,
        seeds = [PAID_CLAIM_APPROVER_SEED.as_bytes(), token_manager.key().as_ref()], bump = bump,
    )]
    claim_approver: Box<Account<'info, PaidClaimApprover>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, bump: u8, payment_amount: u64) -> ProgramResult {
    let claim_approver = &mut ctx.accounts.claim_approver;
    claim_approver.bump = bump;
    claim_approver.payment_amount = payment_amount;
    return Ok(())
}