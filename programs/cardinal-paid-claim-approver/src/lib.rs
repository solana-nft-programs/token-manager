pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR");

#[program]
pub mod cardinal_paid_claim_approver {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        return Err(error!(errors::ErrorCode::ProtocolsShutdown));
        init::handler(ctx, ix)
    }

    pub fn pay<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, PayCtx<'info>>) -> Result<()> {
        return Err(error!(errors::ErrorCode::ProtocolsShutdown));
        pay::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
