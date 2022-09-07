use anchor_lang::prelude::*;

pub const TRANSFER_AUTHORITY_SEED: &str = "transfer-authority";
pub const TRANSFER_AUTHORITY_SIZE: usize = 8 + std::mem::size_of::<TranssferAuthority>() + 8;
#[account]
pub struct TranssferAuthority {
    pub bump: u8,
    pub payment_manager: Pubkey,
}

pub const OFFER_SEED: &str = "offer";
pub const OFFER_SIZE: usize = 8 + std::mem::size_of::<Offer>() + 8;
#[account]
pub struct Offer {
    pub bump: u8,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
    pub offerer: Pubkey,
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
