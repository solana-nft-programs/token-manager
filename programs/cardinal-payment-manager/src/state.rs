use anchor_lang::prelude::*;

pub const PAYMENT_MANAGER_SEED: &str = "payment-manager";
pub const PAYMENT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<PaymentManager>(); 
#[account]
pub struct PaymentManager {
    pub bump: u8,
    pub payment_mint: Pubkey,
}
