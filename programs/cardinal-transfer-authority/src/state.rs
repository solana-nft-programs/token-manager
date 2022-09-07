use anchor_lang::prelude::*;

pub const TRANSFER_AUTHORITY_SEED: &str = "transfer-authority";
pub const TRANSFER_AUTHORITY_SIZE: usize = 8 + std::mem::size_of::<TranssferAuthority>();
#[account]
pub struct TranssferAuthority {
    pub bump: u8,
    pub token_manager: Pubkey,
    pub collector: Pubkey,
    pub payment_amount: Option<u64>,
    pub payment_mint: Option<Pubkey>,
    pub payment_manager: Option<Pubkey>,
}
