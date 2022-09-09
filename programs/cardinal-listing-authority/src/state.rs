use anchor_lang::prelude::*;

pub const LISTING_AUTHORITY_SEED: &str = "listing-authority";
pub const LISTING_AUTHORITY_SIZE: usize = 8 + 1 + 24 + 32 * 5 + 64;
#[account]
pub struct ListingAuthority {
    pub bump: u8,
    pub name: String,
    pub authority: Pubkey,
    pub allowed_marketplaces: Option<Vec<Pubkey>>,
}

pub const MARKETPLACE_SEED: &str = "marketplace";
pub const MARKETPLACE_SIZE: usize = 8 + std::mem::size_of::<ListingAuthority>() + 64;
#[account]
pub struct Marketplace {
    pub bump: u8,
    pub name: String,
    pub payment_manager: Pubkey,
    pub authority: Pubkey,
}

pub const LISTING_SEED: &str = "listing";
pub const LISTING_SIZE: usize = 8 + std::mem::size_of::<Listing>() + 64;
#[account]
pub struct Listing {
    pub bump: u8,
    pub lister: Pubkey,
    pub token_manager: Pubkey,
    pub marketplace: Pubkey,
    // payment
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
}
