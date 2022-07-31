pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("pmvYY6Wgvpe3DEj3UX1FcRpMx43sMLYLJrFTVGcqpdn");

#[program]
pub mod cardinal_payment_manager {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
        init::handler(ctx, ix)
    }

    pub fn manage_payment(ctx: Context<HandlePaymentCtx>, payment_amount: u64) -> Result<()> {
        handle_payment::handler(ctx, payment_amount)
    }

    pub fn handle_payment_with_royalties<'key, 'accounts, 'remaining, 'info>(
        ctx: Context<'key, 'accounts, 'remaining, 'info, HandlePaymentWithRoyaltiesCtx<'info>>,
        payment_amount: u64,
    ) -> Result<()> {
        handle_payment_with_royalties::handler(ctx, payment_amount)
    }

    pub fn close(ctx: Context<CloseCtx>) -> Result<()> {
        close::handler(ctx)
    }
}
