use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateListingAuthorityIx {
    pub authority: Pubkey,
    pub allowed_marketplaces: Option<Vec<Pubkey>>,
}

#[derive(Accounts)]
#[instruction(ix: UpdateListingAuthorityIx)]
pub struct UpdateListingAuthorityCtx<'info> {
    #[account(mut)]
    listing_authority: Box<Account<'info, ListingAuthority>>,
    #[account(mut, constraint = listing_authority.authority == authority.key() @ ErrorCode::InvalidTransferAuthorityAuthority)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateListingAuthorityCtx>, ix: UpdateListingAuthorityIx) -> Result<()> {
    let listing_authority = &mut ctx.accounts.listing_authority;
    listing_authority.authority = ix.authority;
    listing_authority.allowed_marketplaces = ix.allowed_marketplaces;

    Ok(())
}
