pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE");

#[program]
pub mod cardinal_time_invalidator {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    pub fn extend_expiration(ctx: Context<ExtendExpirationCtx>, seconds_to_add: u64) -> Result<()> {
        extend_expiration::handler(ctx, seconds_to_add)
    }

    pub fn reset_expiration(ctx: Context<ResetExpirationCtx>) -> Result<()> {
        reset_expiration::handler(ctx)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
        invalidate::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
