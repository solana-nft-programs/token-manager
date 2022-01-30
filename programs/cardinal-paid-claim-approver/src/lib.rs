pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("pcaQ9jQLzb8VszyM6oPRoiGsdjizxMyvGjauhKPD5EF");

#[program]
pub mod cardinal_paid_claim_approver {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, bump: u8, payment_amount: u64) -> ProgramResult {
        init::handler(ctx, bump, payment_amount)
    }

    pub fn pay(ctx: Context<PayCtx>) -> ProgramResult {
        pay::handler(ctx)
    }
}