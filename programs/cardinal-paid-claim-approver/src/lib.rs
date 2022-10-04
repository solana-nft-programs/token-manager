pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR");

#[program]
pub mod cardinal_paid_claim_approver {
    use super::*;

    #[allow(clippy::result_large_err)]
    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    #[allow(clippy::result_large_err)]
    pub fn pay<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, PayCtx<'info>>) -> Result<()> {
        pay::handler(ctx)
    }

    #[allow(clippy::result_large_err)]
    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
