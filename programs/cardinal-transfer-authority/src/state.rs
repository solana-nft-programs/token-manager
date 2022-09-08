use anchor_lang::prelude::*;

pub const TRANSFER_AUTHORITY_SEED: &str = "transfer-authority";
pub const TRANSFER_AUTHORITY_SIZE: usize = 8 + std::mem::size_of::<TransferAuthority>() + 64;
#[account]
pub struct TransferAuthority {
    pub bump: u8,
    pub name: Option<String>,
    pub marketplace: Option<Pubkey>,
}

pub const MARKETPLACE_SEED: &str = "marketplace";
pub const MARKETPLACE_SIZE: usize = 8 + std::mem::size_of::<TransferAuthority>() + 64;
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

pub fn tranfer_authority_seed(name: Option<String>) -> String {
    if name.is_some() {
        return name.unwrap();
    }
    return "".to_string();
}
