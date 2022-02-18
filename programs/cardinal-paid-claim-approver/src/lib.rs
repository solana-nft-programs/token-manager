pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR");

#[program]
pub mod cardinal_paid_claim_approver {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, payment_amount: u64) -> ProgramResult {
        init::handler(ctx, payment_amount)
    }

    pub fn pay(ctx: Context<PayCtx>) -> ProgramResult {
        pay::handler(ctx)
    }
}