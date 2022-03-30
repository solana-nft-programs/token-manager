use {crate::state::*, anchor_lang::prelude::*};

#[derive(Accounts)]
pub struct InitReceiptMintManagerCtx<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [RECEIPT_MINT_MANAGER_SEED.as_bytes()], bump,
        space = RECEIPT_MINT_MANAGER_SIZE,
    )]
    receipt_mint_manager: Account<'info, ReceiptMintManager>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitReceiptMintManagerCtx>) -> Result<()> {
    let receipt_mint_manager = &mut ctx.accounts.receipt_mint_manager;
    receipt_mint_manager.bump = *ctx.bumps.get("receipt_mint_manager").unwrap();
    Ok(())
}
