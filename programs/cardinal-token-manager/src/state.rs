use anchor_lang::prelude::*;
use std::str::FromStr;

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
    Managed = 1,
    /// Token is unmanaged and can be traded freely until expiration
    Unmanaged = 2,
    /// Token is a metaplex edition and so it uses metaplex program to freeze
    Edition = 3,
}

#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum InvalidationType {
    /// Upon invalidation it will be returned to the issuer
    Return = 1,
    /// Upon invalidation it will remain marked as invalid
    Invalidate = 2,
    /// Upon invalidation the token manager will be deleted and thus the tokens are released
    Release = 3,
}

pub fn token_manager_size(num_invalidators: usize) -> usize {
    return (8 + 1 + 1 + 8 + 1 + 32 + 32 + 8 + 1 + 1 + 8 + 1 + 32 + 33 + 33 + 33 + num_invalidators * 32) + 8 as usize
}

pub const MAX_INVALIDATORS: u8 = 5;
pub const TOKEN_MANAGER_SEED: &str = "token-manager";
#[account]
pub struct TokenManager {
    pub version: u8,
    pub bump: u8,
    pub count: u64,
    pub num_invalidators: u8,
    pub issuer: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub kind: u8,
    pub state: u8,
    pub state_changed_at: i64,
    pub invalidation_type: u8,
    pub recipient_token_account: Pubkey,
    pub receipt_mint: Option<Pubkey>,
    pub claim_approver: Option<Pubkey>,
    pub transfer_authority: Option<Pubkey>,
    pub invalidators: Vec<Pubkey>,
}

pub const MINT_MANAGER_SEED: &str = "mint-manager";
pub const MINT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<MintManager>() + 8; 
#[account]
pub struct MintManager {
    pub bump: u8,
    pub initializer: Pubkey,
    pub token_managers: u64,
}

pub const MINT_COUNTER_SEED: &str = "mint-counter";
pub const MINT_COUNTER_SIZE: usize = 8 + std::mem::size_of::<MintCounter>() + 8; 
#[account]
pub struct MintCounter {
    pub bump: u8,
    pub mint: Pubkey,
    pub count: u64,
}

pub const CLAIM_RECEIPT_SEED: &str = "claim-receipt";
pub const CLAIM_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<ClaimReceipt>() + 8; 
#[account]
pub struct ClaimReceipt {
    pub mint_count: u64,
    pub token_manager: Pubkey,
    pub target: Pubkey
}

pub const TRANSFER_RECEIPT_SEED: &str = "transfer-receipt";
pub const TRANSFER_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<TranferReceipt>() + 8; 
#[account]
pub struct TranferReceipt {
    pub mint_count: u64,
    pub token_manager: Pubkey,
    pub target: Pubkey
}

pub const FEE_SCALE: u64 = 10000;
pub const PROVIDER_FEE: u64 = 0;
pub const RECIPIENT_FEE: u64 = 0;
pub fn assert_payment_manager(key: &Pubkey) -> bool {
    let allowed_payment_managers = [
        Pubkey::from_str("crdk1Mw5WzoVNgz8RgHJXzHdwSrJvp4UcGirvtJzB6U").unwrap(),
    ];
    return allowed_payment_managers.contains(key)
}

pub const RECEIPT_MINT_MANAGER_SEED: &str = "receipt-mint-manager";
pub const RECEIPT_MINT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<ReceiptMintManager>() + 8; 
#[account]
pub struct ReceiptMintManager {
    pub bump: u8,
}