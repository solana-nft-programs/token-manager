pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("tmexpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe");

#[program]
pub mod cardinal_time_invalidator {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, bump: u8, expiration: i64) -> ProgramResult {
        init::handler(ctx, bump, expiration)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
        invalidate::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> ProgramResult {
        close::handler(ctx)
    }

}