pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("trsMRg3GzFSNgC3tdhbuKUES8YvGtUBbzp5fjxLtVQW");

#[program]
pub mod cardinal_transfer_authority {
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

    pub fn init_transfer_authority(ctx: Context<InitTransferAuthorityCtx>, ix: InitTransferAuthorityIx) -> Result<()> {
        init_transfer_authority::handler(ctx, ix)
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

    pub fn update_transfer_authority(ctx: Context<UpdateTransferAuthorityCtx>, ix: UpdateTransferAuthorityIx) -> Result<()> {
        update_transfer_authority::handler(ctx, ix)
    }
}
