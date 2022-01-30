use anchor_lang::prelude::*;

pub const PAID_CLAIM_APPROVER_SEED: &str = "paid-claim-approver";
pub const PAID_CLAIM_APPROVER_SIZE: usize = 8 + std::mem::size_of::<PaidClaimApprover>() + 8; 
#[account]
pub struct PaidClaimApprover {
    pub bump: u8,
    pub payment_mint: Pubkey,
    pub payment_amount: u64,
}
