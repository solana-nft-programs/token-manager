pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW");

#[program]
pub mod cardinal_transfer_authority {

    use super::*;

    // transfer authority
    pub fn init_transfer_authority(ctx: Context<InitTransferAuthorityCtx>, ix: InitTransferAuthorityIx) -> Result<()> {
        transfer_authority::init_transfer_authority::handler(ctx, ix)
    }

    pub fn update_transfer_authority(ctx: Context<UpdateTransferAuthorityCtx>, ix: UpdateTransferAuthorityIx) -> Result<()> {
        transfer_authority::update_transfer_authority::handler(ctx, ix)
    }

    pub fn whitelist_marketplaces(ctx: Context<WhitelistMarketplacesCtx>, ix: WhitelistMarketplacesIx) -> Result<()> {
        transfer_authority::whitelist_marketplaces::handler(ctx, ix)
    }

    pub fn release<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ReleaseCtx<'info>>) -> Result<()> {
        transfer_authority::release::handler(ctx)
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
