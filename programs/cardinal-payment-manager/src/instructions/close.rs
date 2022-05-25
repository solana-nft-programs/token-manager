use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    #[account(mut, close = collector)]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut, constraint = collector.key() == payment_manager.collector @ ErrorCode::InvalidCollector)]
    /// CHECK: This is not dangerous because this is just the pubkey that collects the closing account lamports
    collector: UncheckedAccount<'info>,

    #[account(mut, constraint = closer.key() == payment_manager.authority @ ErrorCode::InvalidAuthority)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> Result<()> {
    Ok(())
}
