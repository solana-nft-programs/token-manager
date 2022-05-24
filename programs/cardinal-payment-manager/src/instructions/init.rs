use {crate::state::*, anchor_lang::prelude::*};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub name: String,
    pub maker_fee: u64,
    pub taker_fee: u64,
    pub fee_scale: u64,
}

#[derive(Accounts)]
#[instruction(ix: InitIx)]
pub struct InitCtx<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = PAYMENT_MANAGER_SIZE,
        seeds = [PAYMENT_MANAGER_SEED.as_bytes(), ix.name.as_bytes()], bump,
    )]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut)]
    authority: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
    let payment_manager = &mut ctx.accounts.payment_manager;
    payment_manager.bump = *ctx.bumps.get("payment_manager").unwrap();
    payment_manager.taker_fee = ix.taker_fee;
    payment_manager.authority = ctx.accounts.authority.key();
    payment_manager.maker_fee = ix.maker_fee;
    payment_manager.fee_scale = ix.fee_scale;
    payment_manager.name = ix.name;
    Ok(())
}
