pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp");

#[program]
pub mod cardinal_use_invalidator {
    use super::*;

    #[allow(clippy::result_large_err)]
    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    #[allow(clippy::result_large_err)]
    pub fn increment_usages(ctx: Context<IncrementUsagesCtx>, num_usages: u64) -> Result<()> {
        increment_usages::handler(ctx, num_usages)
    }

    #[allow(clippy::result_large_err)]
    pub fn extend_usages<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ExtendUsagesCtx<'info>>, payment_amount: u64) -> Result<()> {
        extend_usages::handler(ctx, payment_amount)
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
