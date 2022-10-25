use {crate::state::*, anchor_lang::prelude::*};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitMarketplaceIx {
    pub name: String,
    pub payment_manager: Pubkey,
    pub authority: Pubkey,
    pub payment_mints: Option<Vec<Pubkey>>,
}

#[derive(Accounts)]
#[instruction(ix: InitMarketplaceIx)]
pub struct InitMarketplaceCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = MARKETPLACE_SIZE,
        seeds = [MARKETPLACE_SEED.as_bytes(), ix.name.as_bytes()], bump,
    )]
    marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitMarketplaceCtx>, ix: InitMarketplaceIx) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    marketplace.name = ix.name;
    marketplace.payment_manager = ix.payment_manager;
    marketplace.authority = ix.authority;
    marketplace.payment_mints = ix.payment_mints;

    Ok(())
}
