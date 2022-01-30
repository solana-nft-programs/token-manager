pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("cpmTAQfUopUzqu2BAR5EfnUfqJSgZkMoU7QBvkueyEn");

#[program]
pub mod cardinal_payment_manager {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, bump: u8) -> ProgramResult {
        init::handler(ctx, bump)
    }

    pub fn settle(ctx: Context<SettleCtx>) -> ProgramResult {
        settle::handler(ctx)
    }
}