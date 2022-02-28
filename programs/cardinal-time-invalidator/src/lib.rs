pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE");

#[program]
pub mod cardinal_time_invalidator {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> ProgramResult {
        init::handler(ctx, ix)
    }

    pub fn set_expiration(ctx: Context<SetExpirationCtx>) -> ProgramResult {
        set_expiration::handler(ctx)
    }

    pub fn extend_expiration(ctx: Context<ExtendExpirationCtx>, payment_amount: u64) -> ProgramResult {
        extend_expiration::handler(ctx, payment_amount)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
        invalidate::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> ProgramResult {
        close::handler(ctx)
    }
}