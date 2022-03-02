pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE");

#[program]
pub mod cardinal_time_invalidator {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    pub fn set_expiration(ctx: Context<SetExpirationCtx>) -> Result<()> {
        set_expiration::handler(ctx)
    }

    pub fn extend_expiration(ctx: Context<ExtendExpirationCtx>, payment_amount: u64) -> Result<()> {
        extend_expiration::handler(ctx, payment_amount)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
        invalidate::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}