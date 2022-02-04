use anchor_lang::prelude::*;

pub const USE_INVALIDATOR_SEED: &str = "use-invalidator";
pub const USE_INVALIDATOR_SIZE: usize = 8 + std::mem::size_of::<UseInvalidator>(); 
#[account]
pub struct UseInvalidator {
    pub bump: u8,
    pub usages: u64,
    pub max_usages: Option<u64>,
    pub use_authority: Pubkey,
}
