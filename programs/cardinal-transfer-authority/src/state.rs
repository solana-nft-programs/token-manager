use anchor_lang::prelude::*;

pub const TRANSFER_AUTHORITY_SEED: &str = "transfer-authority";
pub const TRANSFER_AUTHORITY_SIZE: usize = 8 + std::mem::size_of::<TransferAuthority>() + 8;
#[account]
pub struct TransferAuthority {
    pub bump: u8,
    pub authority: Pubkey,
    pub payment_manager: Pubkey,
    pub name: String,
}

pub const LISTING_SEED: &str = "listing";
pub const LISTING_SIZE: usize = 8 + std::mem::size_of::<Listing>() + 8;
#[account]
pub struct Listing {
    pub bump: u8,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
    pub lister: Pubkey,
    pub token_manager: Pubkey,
}

pub const BID_SEED: &str = "bid";
pub const BID_SIZE: usize = 8 + std::mem::size_of::<Bid>() + 8;
#[account]
pub struct Bid {
    pub bump: u8,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
    pub bidder: Pubkey,
    pub token_manager: Pubkey,
}
