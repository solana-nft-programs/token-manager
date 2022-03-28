use anchor_lang::prelude::*;

pub const PAID_CLAIM_APPROVER_SEED: &str = "paid-claim-approver";
pub const PAID_CLAIM_APPROVER_SIZE: usize = 8 + std::mem::size_of::<PaidClaimApprover>();
#[account]
pub struct PaidClaimApprover {
    pub bump: u8,
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
    pub token_manager: Pubkey,
}
