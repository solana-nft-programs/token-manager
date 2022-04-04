pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("t5DEoCV1arWsMSCurX19CpFASKVyqrvvvDmFvWiGLoE");

#[program]
pub mod cardinal_use_invalidator {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    pub fn increment_usages(ctx: Context<IncrementUsagesCtx>, num_usages: u64) -> Result<()> {
        increment_usages::handler(ctx, num_usages)
    }

    pub fn extend_usages(ctx: Context<ExtendUsagesCtx>, payment_amount: u64) -> Result<()> {
        extend_usages::handler(ctx, payment_amount)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
        invalidate::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
