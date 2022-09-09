use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct RemoveListingCtx<'info> {
    #[account(mut, close = lister)]
    listing: Box<Account<'info, Listing>>,

    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,
}

pub fn handler(_ctx: Context<RemoveListingCtx>) -> Result<()> {
    Ok(())
}
