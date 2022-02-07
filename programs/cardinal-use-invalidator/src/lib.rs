pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("useB5qbYZgjE14qXxWx17Zm4JS5bzWrDcWXt3uBq62L");

#[program]
pub mod cardinal_use_invalidator {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, bump: u8, max_usages: Option<u64>) -> ProgramResult {
        init::handler(ctx, bump, max_usages)
    }

    pub fn increment_usages(ctx: Context<IncrementUsagesCtx>, num_usages: u64) -> ProgramResult {
        increment_usages::handler(ctx, num_usages)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
        invalidate::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> ProgramResult {
        close::handler(ctx)
    }
}