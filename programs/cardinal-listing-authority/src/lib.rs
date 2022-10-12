pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW");

#[program]
pub mod cardinal_listing_authority {

    use super::*;

    // listing authority
    pub fn init_listing_authority(ctx: Context<InitTransferAuthorityCtx>, ix: InitListingAuthorityIx) -> Result<()> {
        listing_authority::init_listing_authority::handler(ctx, ix)
    }

    pub fn update_listing_authority(ctx: Context<UpdateListingAuthorityCtx>, ix: UpdateListingAuthorityIx) -> Result<()> {
        listing_authority::update_listing_authority::handler(ctx, ix)
    }

    pub fn whitelist_marketplaces(ctx: Context<WhitelistMarketplacesCtx>, ix: WhitelistMarketplacesIx) -> Result<()> {
        listing_authority::whitelist_marketplaces::handler(ctx, ix)
    }

    pub fn eject(ctx: Context<EjectCtx>) -> Result<()> {
        listing_authority::eject::handler(ctx)
    }

    // listing
    pub fn create_listing(ctx: Context<CreateListingCtx>, ix: CreateListingIx) -> Result<()> {
        listing::create_listing::handler(ctx, ix)
    }

    pub fn update_listing(ctx: Context<UpdateListingCtx>, ix: UpdateListingIx) -> Result<()> {
        listing::update_listing::handler(ctx, ix)
    }

    pub fn accept_listing<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, AcceptListingCtx<'info>>) -> Result<()> {
        listing::accept_listing::handler(ctx)
    }

    pub fn remove_listing(ctx: Context<RemoveListingCtx>) -> Result<()> {
        listing::remove_listing::handler(ctx)
    }

    // marketplace
    pub fn init_marketplace(ctx: Context<InitMarketplaceCtx>, ix: InitMarketplaceIx) -> Result<()> {
        marketplace::init_marketplace::handler(ctx, ix)
    }

    pub fn update_marketplace(ctx: Context<UpdateMarketplaceCtx>, ix: UpdateMarketplaceIx) -> Result<()> {
        marketplace::update_marketplace::handler(ctx, ix)
    }

    // transfer
    pub fn init_transfer(ctx: Context<InitTransferCtx>, ix: InitTransferIx) -> Result<()> {
        transfer::init_transfer::handler(ctx, ix)
    }

    pub fn cancel_transfer(ctx: Context<CancelTransferCtx>) -> Result<()> {
        transfer::cancel_transfer::handler(ctx)
    }

    pub fn accept_transfer<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, AcceptTransferCtx<'info>>) -> Result<()> {
        transfer::accept_transfer::handler(ctx)
    }
}
