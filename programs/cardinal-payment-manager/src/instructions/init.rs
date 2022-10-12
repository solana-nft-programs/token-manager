use {crate::state::*, anchor_lang::prelude::*};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub name: String,
    pub fee_collector: Pubkey,
    pub maker_fee_basis_points: u16,
    pub taker_fee_basis_points: u16,
    pub include_seller_fee_basis_points: bool,
    pub royalty_fee_share: Option<u64>,
}

#[derive(Accounts)]
#[instruction(ix: InitIx)]
pub struct InitCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = PAYMENT_MANAGER_SIZE,
        seeds = [PAYMENT_MANAGER_SEED.as_bytes(), ix.name.as_bytes()], bump,
    )]
    payment_manager: Box<Account<'info, PaymentManager>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    authority: UncheckedAccount<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
    let payment_manager = &mut ctx.accounts.payment_manager;
    payment_manager.bump = *ctx.bumps.get("payment_manager").unwrap();
    payment_manager.name = ix.name;
    payment_manager.fee_collector = ix.fee_collector;
    payment_manager.maker_fee_basis_points = ix.maker_fee_basis_points;
    payment_manager.taker_fee_basis_points = ix.taker_fee_basis_points;
    payment_manager.authority = ctx.accounts.authority.key();
    payment_manager.include_seller_fee_basis_points = ix.include_seller_fee_basis_points;
    payment_manager.royalty_fee_share = ix.royalty_fee_share;
    Ok(())
}
