use anchor_lang::prelude::*;

pub const PAYMENT_MANAGER_SEED: &str = "payment-manager";
pub const PAYMENT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<PaymentManager>();

#[account]
pub struct PaymentManager {
    pub bump: u8,
    pub collector: Pubkey,
    pub authority: Pubkey,
    pub maker_fee: u64,
    pub taker_fee: u64,
    pub fee_scale: u64,
    pub name: String,
}
