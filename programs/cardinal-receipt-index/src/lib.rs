pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("rcpCr9GVsP2CPmS11uuFXUXbzc5JJQFMDvDRn8JDQNh");

#[program]
pub mod cardinal_receipt_index {
    use super::*;

    pub fn claim(ctx: Context<ClaimCtx>, name: String) -> ProgramResult {
        claim::handler(ctx, name)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
        invalidate::handler(ctx)
    }
}