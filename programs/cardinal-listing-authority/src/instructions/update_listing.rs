use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateListingIx {
    pub marketplace: Pubkey,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: UpdateListingIx)]
pub struct UpdateListingCtx<'info> {
    #[account(mut)]
    listing: Box<Account<'info, Listing>>,

    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateListingCtx>, ix: UpdateListingIx) -> Result<()> {
    let listing = &mut ctx.accounts.listing;
    listing.marketplace = ix.marketplace.key();
    listing.payment_amount = ix.payment_amount;
    listing.payment_mint = ix.payment_mint;

    Ok(())
}
