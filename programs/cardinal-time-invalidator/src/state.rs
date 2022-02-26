use anchor_lang::prelude::*;

pub const TIME_INVALIDATOR_SEED: &str = "time-invalidator";
pub const TIME_INVALIDATOR_SIZE: usize = 8 + std::mem::size_of::<TimeInvalidator>(); 
#[account]
pub struct TimeInvalidator {
    pub bump: u8,
    pub expiration: Option<i64>,
    pub token_manager: Pubkey,
    pub duration: i64,
    pub start_on_init: bool,
    // TODO extendability
}
