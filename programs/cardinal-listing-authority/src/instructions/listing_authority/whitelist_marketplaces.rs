use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WhitelistMarketplacesIx {
    pub allowed_marketplaces: Vec<Pubkey>,
}

#[derive(Accounts)]
#[instruction(ix: WhitelistMarketplacesIx)]
pub struct WhitelistMarketplacesCtx<'info> {
    #[account(mut)]
    listing_authority: Box<Account<'info, ListingAuthority>>,

    #[account(mut, constraint = authority.key() == listing_authority.authority @ ErrorCode::InvalidListingAuthority)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<WhitelistMarketplacesCtx>, ix: WhitelistMarketplacesIx) -> Result<()> {
    let listing_authority = &mut ctx.accounts.listing_authority;

    if ix.allowed_marketplaces.len() == 0 {
        listing_authority.allowed_marketplaces = None;
    } else {
        listing_authority.allowed_marketplaces = Some(ix.allowed_marketplaces);
    }

    Ok(())
}
