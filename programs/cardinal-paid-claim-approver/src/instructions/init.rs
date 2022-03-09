use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = PAID_CLAIM_APPROVER_SIZE,
        seeds = [PAID_CLAIM_APPROVER_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    claim_approver: Box<Account<'info, PaidClaimApprover>>,

    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, payment_mint: Pubkey, payment_amount: u64) -> Result<()> {
    let claim_approver = &mut ctx.accounts.claim_approver;
    claim_approver.bump = *ctx.bumps.get("claim_approver").unwrap();
    claim_approver.payment_amount = payment_amount;
    claim_approver.payment_mint = payment_mint;
    claim_approver.token_manager = ctx.accounts.token_manager.key();
    return Ok(())
}