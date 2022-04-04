pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("t1LVbNwJZT3pxFQHfY65jp6QbvcTvda6oPSbaeKbYEs");

#[program]
pub mod cardinal_paid_claim_approver {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, payment_mint: Pubkey, payment_amount: u64, collector: Pubkey) -> Result<()> {
        init::handler(ctx, payment_mint, payment_amount, collector)
    }

    pub fn pay(ctx: Context<PayCtx>) -> Result<()> {
        pay::handler(ctx)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
