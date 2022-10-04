pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE");

#[program]
pub mod cardinal_time_invalidator {
    use super::*;

    #[allow(clippy::result_large_err)]
    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    #[allow(clippy::result_large_err)]
    pub fn extend_expiration<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ExtendExpirationCtx<'info>>, seconds_to_add: u64) -> Result<()> {
        extend_expiration::handler(ctx, seconds_to_add)
    }

    #[allow(clippy::result_large_err)]
    pub fn reset_expiration(ctx: Context<ResetExpirationCtx>) -> Result<()> {
        reset_expiration::handler(ctx)
    }

    #[allow(clippy::result_large_err)]
    pub fn update_max_expiration(ctx: Context<UpdateMaxExpirationCtx>, ix: UpdateMaxExpirationIx) -> Result<()> {
        update_max_expiration::handler(ctx, ix)
    }

    #[allow(clippy::result_large_err)]
    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
        invalidate::handler(ctx)
    }

    #[allow(clippy::result_large_err)]
    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
