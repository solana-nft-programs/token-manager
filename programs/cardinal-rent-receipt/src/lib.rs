pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("rcpxpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe");

#[program]
pub mod cardinal_rent_receipt {
    use super::*;

    pub fn claim(ctx: Context<ClaimCtx>, bump: u8, receipt_manager_bump: u8) -> ProgramResult {
        claim::handler(ctx, bump, receipt_manager_bump)
    }

    pub fn invalidate(ctx: Context<InvalidateCtx>) -> ProgramResult {
        invalidate::handler(ctx)
    }
}