use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{Mint}},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = PAYMENT_MANAGER_SIZE,
        seeds = [PAYMENT_MANAGER_SEED.as_bytes(), token_manager.key().as_ref()], bump = bump,
    )]
    payment_manager: Box<Account<'info, PaymentManager>>,
    payment_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, bump: u8) -> ProgramResult {
    let payment_manager = &mut ctx.accounts.payment_manager;
    payment_manager.bump = bump;
    payment_manager.payment_mint = ctx.accounts.payment_mint.key();
    return Ok(())
}