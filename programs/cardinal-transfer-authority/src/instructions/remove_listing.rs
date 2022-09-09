use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_lang::AccountsClose,
};

#[derive(Accounts)]
pub struct RemoveListingCtx<'info> {
    #[account(mut)]
    listing: Box<Account<'info, Listing>>,

    #[account(mut, constraint = lister.key() == listing.lister @ ErrorCode::InvalidLister)]
    lister: Signer<'info>,
}

pub fn handler(ctx: Context<RemoveListingCtx>) -> Result<()> {
    ctx.accounts.listing.close(ctx.accounts.lister.to_account_info())?;
    Ok(())
}
