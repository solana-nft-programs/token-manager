pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE");

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