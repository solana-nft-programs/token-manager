use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateMarketplaceIx {
    pub payment_manager: Pubkey,
    pub authority: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: UpdateMarketplaceIx)]
pub struct UpdateMarketplaceCtx<'info> {
    #[account(mut, constraint = marketplace.authority == authority.key() @ ErrorCode::InvalidMarketplaceAuthority)]
    marketplace: Box<Account<'info, Marketplace>>,

    #[account(mut)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateMarketplaceCtx>, ix: UpdateMarketplaceIx) -> Result<()> {
    let marketplace = &mut ctx.accounts.marketplace;
    marketplace.payment_manager = ix.payment_manager;
    marketplace.authority = ix.authority;

    Ok(())
}
