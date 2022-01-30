use anchor_lang::prelude::*;

pub const RENTAL_COUNTER_SEED: &str = "rental-counter";
pub const RENTAL_COUNTER_SIZE: usize = 8 + std::mem::size_of::<RentalCounter>(); 
#[account]
pub struct RentalCounter {
    pub count: u64,
}
