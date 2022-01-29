use anchor_lang::prelude::*;

#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum TokenManagerState {
    /// Token is issued
    Issued = 1,
    /// Token is claimed and valid
    Claimed = 2,
    /// Token is invalid
    Invalidated = 3,
}


#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum TokenManagerKind {
    /// Token a managed rental and will be returned to issuer
    Managed = 1,
    /// Token is unmanaged and can be traded freely until expiration
    Unmanaged = 2,
}

pub fn token_manager_size(num_invalidators: usize) -> usize {
    return (8 + 1 + 32 + 32 + 8 + 1 + 1 + 32 + 32 + 32 + num_invalidators * 32) as usize
}

pub const TOKEN_MANAGER_SEED: &str = "token-manager";
#[account]
pub struct TokenManager {
    pub bump: u8,
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub kind: u8,
    pub state: TokenManagerState,
    pub payment_collector: Option<Pubkey>,
    pub claim_authority: Option<Pubkey>,
    pub transfer_authority: Option<Pubkey>,
    pub invalidators: Vec<Pubkey>,
}

pub const CLAIM_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<ClaimReceipt>() + 8; 
#[account]
pub struct ClaimReceipt {
    pub bump: u8,
}

pub const TRANSFER_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<TranferReceipt>() + 8; 
#[account]
pub struct TranferReceipt {
    pub bump: u8,
}
