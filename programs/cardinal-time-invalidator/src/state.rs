use anchor_lang::prelude::*;

pub const TIME_INVALIDATOR_SEED: &str = "time-invalidator";
pub const TIME_INVALIDATOR_SIZE: usize = 8 + std::mem::size_of::<TimeInvalidator>() + 8;
#[account]
pub struct TimeInvalidator {
    pub bump: u8,
    pub token_manager: Pubkey,
    pub payment_manager: Pubkey,
    pub collector: Pubkey,
    pub expiration: Option<i64>,
    pub duration_seconds: Option<i64>,
    pub extension_payment_amount: Option<u64>,
    pub extension_duration_seconds: Option<u64>,
    pub extension_payment_mint: Option<Pubkey>,
    pub max_expiration: Option<i64>,
    pub disable_partial_extension: Option<bool>,
}
