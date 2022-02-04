use anchor_lang::prelude::*;

#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum TokenManagerState {
    /// Token manager is initialized
    Initialized = 0,
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
    /// Token a managed rental and will use freeze authority to manage the token
    Authority = 1,
    /// Token is unmanaged and can be traded freely until expiration
    Unmanaged = 2,
    /// Token is a metaplex edition and so it uses metaplex program to freeze
    Edition = 3,
}

pub fn token_manager_size(num_invalidators: usize) -> usize {
    return (8 + 32 + 1 + 1 + 32 + 32 + 8 + 1 + 1 + 32 + 32 + 32 + 32 + num_invalidators * 32) + 8 as usize
}

pub const MAX_INVALIDATORS: u8 = 5;
pub const TOKEN_MANAGER_SEED: &str = "token-manager";
#[account]
pub struct TokenManager {
    pub bump: u8,
    pub num_invalidators: u8,
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub kind: u8,
    pub state: u8,
    pub recipient_token_account: Pubkey,
    pub payment_manager: Option<Pubkey>,
    pub claim_approver: Option<Pubkey>,
    pub transfer_authority: Option<Pubkey>,
    pub invalidators: Vec<Pubkey>,
}

pub const CLAIM_RECEIPT_SEED: &str = "claim-receipt";
pub const CLAIM_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<ClaimReceipt>() + 8; 
#[account]
pub struct ClaimReceipt {}

pub const TRANSFER_RECEIPT_SEED: &str = "transfer-receipt";
pub const TRANSFER_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<TranferReceipt>() + 8; 
#[account]
pub struct TranferReceipt {}
