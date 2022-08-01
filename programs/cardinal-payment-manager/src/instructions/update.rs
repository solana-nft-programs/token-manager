use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateIx {
    pub authority: Pubkey,
    pub fee_collector: Pubkey,
    pub maker_fee_basis_points: u16,
    pub taker_fee_basis_points: u16,
}

#[derive(Accounts)]
#[instruction(ix: UpdateIx)]
pub struct UpdateCtx<'info> {
    #[account(mut, constraint = payment_manager.authority == payer.key() @ ErrorCode::InvalidPaymentManager)]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdateCtx>, ix: UpdateIx) -> Result<()> {
    let payment_manager = &mut ctx.accounts.payment_manager;
    payment_manager.authority = ix.authority;
    payment_manager.fee_collector = ix.fee_collector;
    payment_manager.maker_fee_basis_points = ix.maker_fee_basis_points;
    payment_manager.taker_fee_basis_points = ix.taker_fee_basis_points;
    Ok(())
}
