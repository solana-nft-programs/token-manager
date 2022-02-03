use anchor_lang::prelude::*;

pub const RENT_RECEIPT_SEED: &str = "rent-receipt";
pub const RENT_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<RentReceipt>(); 
#[account]
pub struct RentReceipt {
    pub bump: u8,
    pub receipt_manager: Pubkey
}
