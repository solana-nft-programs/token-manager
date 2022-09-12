pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("t7UND4Dhg8yoykPAr1WjwfZhfHDwXih5RY8voM47FMS");

#[program]
pub mod cardinal_listing_authority {
    use super::*;

    pub fn accept_listing<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, AcceptListingCtx<'info>>) -> Result<()> {
        accept_listing::handler(ctx)
    }

    pub fn create_listing(ctx: Context<CreateListingCtx>, ix: CreateListingIx) -> Result<()> {
        create_listing::handler(ctx, ix)
    }

    pub fn init_marketplace(ctx: Context<InitMarketplaceCtx>, ix: InitMarketplaceIx) -> Result<()> {
        init_marketplace::handler(ctx, ix)
    }

    pub fn init_listing_authority(ctx: Context<InitTransferAuthorityCtx>, ix: InitListingAuthorityIx) -> Result<()> {
        init_listing_authority::handler(ctx, ix)
    }

    pub fn remove_listing(ctx: Context<RemoveListingCtx>) -> Result<()> {
        remove_listing::handler(ctx)
    }

    pub fn update_listing(ctx: Context<UpdateListingCtx>, ix: UpdateListingIx) -> Result<()> {
        update_listing::handler(ctx, ix)
    }

    pub fn update_marketplace(ctx: Context<UpdateMarketplaceCtx>, ix: UpdateMarketplaceIx) -> Result<()> {
        update_marketplace::handler(ctx, ix)
    }

    pub fn update_listing_authority(ctx: Context<UpdateListingAuthorityCtx>, ix: UpdateListingAuthorityIx) -> Result<()> {
        update_listing_authority::handler(ctx, ix)
    }

    pub fn whitelist_marketplaces(ctx: Context<WhitelistMarketplacesCtx>, ix: WhitelistMarketplacesIx) -> Result<()> {
        whitelist_marketplaces::handler(ctx, ix)
    }
}
