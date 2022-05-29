use anchor_lang::prelude::*;

pub const PAYMENT_MANAGER_SEED: &str = "payment-manager";
pub const PAYMENT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<PaymentManager>() + 16;
pub const BASIS_POINTS_DIVISOR: u16 = 10000;

#[account]
pub struct PaymentManager {
    pub bump: u8,
    pub fee_collector: Pubkey,
    pub authority: Pubkey,
    pub maker_fee_basis_points: u16,
    pub taker_fee_basis_points: u16,
    pub name: String,
}
