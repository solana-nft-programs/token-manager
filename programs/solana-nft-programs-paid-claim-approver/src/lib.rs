pub mod errors;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use instructions::*;

declare_id!("pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR");

#[program]
pub mod solana_nft_programs_paid_claim_approver {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    pub fn pay<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, PayCtx<'info>>) -> Result<()> {
        pay::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
