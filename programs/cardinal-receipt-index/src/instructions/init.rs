use {
    crate::{state::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
#[instruction(issuer: Pubkey, bump: u8)]
pub struct InitCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = RECEIPT_COUNTER_SIZE,
        seeds = [RECEIPT_COUNTER_SEED.as_bytes(), issuer.key().as_ref()], bump = bump,
    )]
    receipt_counter: Box<Account<'info, ReceiptCounter>>,
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, _issuer: Pubkey, bump: u8) -> ProgramResult {
    let receipt_counter = &mut ctx.accounts.receipt_counter;
    receipt_counter.bump = bump;
    return Ok(())
}