use anchor_lang::prelude::*;

pub const USE_INVALIDATOR_SEED: &str = "use-invalidator";
pub const USE_INVALIDATOR_SIZE: usize = 8 + std::mem::size_of::<UseInvalidator>() + 8;
#[account]
pub struct UseInvalidator {
    pub bump: u8,
    pub usages: u64,
    pub token_manager: Pubkey,
    pub collector: Pubkey,
    pub use_authority: Option<Pubkey>,
    pub total_usages: Option<u64>,
    pub extension_payment_amount: Option<u64>,
    pub extension_payment_mint: Option<Pubkey>,
    pub extension_usages: Option<u64>,
    pub max_usages: Option<u64>,
}
