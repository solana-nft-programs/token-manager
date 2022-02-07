use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
#[instruction(bump: u8, payment_amount: u64)]
pub struct InitCtx<'info> {
    #[account(constraint =
        token_manager.payment_mint != None
        && token_manager.state == TokenManagerState::Initialized as u8
        @ ErrorCode::InvalidTokenManager
    )]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
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