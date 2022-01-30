use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{Mint}},
    cardinal_token_manager::{state::TokenManager},
};

#[derive(Accounts)]
#[instruction(bump: u8, payment_amount: u64)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.payment_manager == None @ ErrorCode::MissingPaymentManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init,
        payer = payer,
        space = PAID_CLAIM_APPROVER_SIZE,
        seeds = [PAID_CLAIM_APPROVER_SEED.as_bytes(), token_manager.key().as_ref()], bump = bump,
    )]
    claim_approver: Box<Account<'info, PaidClaimApprover>>,

    // todo maybe pass as arg
    payment_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, bump: u8, payment_amount: u64) -> ProgramResult {
    // todo check payment manager funds

    // set token manager data
    let claim_approver = &mut ctx.accounts.claim_approver;
    claim_approver.bump = bump;
    claim_approver.payment_amount = payment_amount;
    claim_approver.payment_mint = ctx.accounts.payment_mint.key();
    return Ok(())
}