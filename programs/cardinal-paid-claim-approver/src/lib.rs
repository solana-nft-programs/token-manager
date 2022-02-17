pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR");

#[program]
pub mod cardinal_paid_claim_approver {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, bump: u8, payment_amount: u64) -> ProgramResult {
        init::handler(ctx, bump, payment_amount)
    }

    pub fn pay(ctx: Context<PayCtx>, claim_receipt_bump: u8) -> ProgramResult {
        pay::handler(ctx, claim_receipt_bump)
    }
}