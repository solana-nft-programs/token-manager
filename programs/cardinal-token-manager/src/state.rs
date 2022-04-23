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
    /// Upon invalidation the token manager will be reset back to issued state
    Reissue = 4,
}

pub const INVALIDATION_REWARD_LAMPORTS: u64 = 5_000_000;

pub fn token_manager_size(num_invalidators: usize) -> usize {
    (8 + 1 + 1 + 8 + 1 + 32 + 32 + 8 + 1 + 1 + 8 + 1 + 32 + 33 + 33 + 33 + num_invalidators * 32) + 8_usize
}

pub const MAX_INVALIDATORS: u8 = 5;
pub const TOKEN_MANAGER_SEED: &str = "token-manager";
#[account]
pub struct TokenManager {
    // Version of this token manager
    pub version: u8,
    // Canonical bump
    pub bump: u8,
    // Count for number of token managers for this specific mint
    pub count: u64,
    // Number of invalidators in this current token manager
    pub num_invalidators: u8,
    // Issuer or initializer of this token manager
    pub issuer: Pubkey,
    // Mint of this token manager
    pub mint: Pubkey,
    // Amount of the given mint
    pub amount: u64,
    // Kind indicating how this token manager manages this token
    pub kind: u8,
    // Current state
    pub state: u8,
    // Timestamp for last state change
    pub state_changed_at: i64,
    // What happens upon invalidation
    pub invalidation_type: u8,
    // Token account holding the token currently
    pub recipient_token_account: Pubkey,
    // Mint representing the rightful owner of this token
    pub receipt_mint: Option<Pubkey>,
    // Authority to approve claiming this token
    pub claim_approver: Option<Pubkey>,
    // Authority to approve transfering this token
    pub transfer_authority: Option<Pubkey>,
    // Public keys that are allowed to invalidate this token manager
    pub invalidators: Vec<Pubkey>,
}

pub const MINT_MANAGER_SEED: &str = "mint-manager";
pub const MINT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<MintManager>() + 8;
#[account]
pub struct MintManager {
    // Canonical bump
    pub bump: u8,
    // Initializer who can also close this mint manager
    pub initializer: Pubkey,
    // Number of outstanding token managers currently using this mint manager
    pub token_managers: u64,
}

pub const MINT_COUNTER_SEED: &str = "mint-counter";
pub const MINT_COUNTER_SIZE: usize = 8 + std::mem::size_of::<MintCounter>() + 8;
#[account]
pub struct MintCounter {
    // Cannonical bump
    pub bump: u8,
    // Mint for this counter
    pub mint: Pubkey,
    // Number of token managers created for this mint
    pub count: u64,
}

pub const CLAIM_RECEIPT_SEED: &str = "claim-receipt";
pub const CLAIM_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<ClaimReceipt>() + 8;
#[account]
pub struct ClaimReceipt {
    // Count of this mint
    pub mint_count: u64,
    // Token manager this claim receipt is for
    pub token_manager: Pubkey,
    // Target who can use this claim receipt to claim the token manager
    pub target: Pubkey,
}

pub const TRANSFER_RECEIPT_SEED: &str = "transfer-receipt";
pub const TRANSFER_RECEIPT_SIZE: usize = 8 + std::mem::size_of::<TranferReceipt>() + 8;
#[account]
pub struct TranferReceipt {
    // Count of this mint
    pub mint_count: u64,
    // Token manager this claim receipt is for
    pub token_manager: Pubkey,
    // Target who can use this claim receipt to transfer the token manager
    pub target: Pubkey,
}

pub const FEE_SCALE: u64 = 10000;
pub const PROVIDER_FEE: u64 = 0;
pub const RECIPIENT_FEE: u64 = 0;
pub fn assert_payment_manager(key: &Pubkey) -> bool {
    let allowed_payment_managers = [
        Pubkey::from_str("crkdpVWjHWdggGgBuSyAqSmZUmAjYLzD435tcLDRLXr").unwrap(),
        Pubkey::from_str("cprtEVpR3uPs38USVq1MYrPMW7exZTnq2kRNSuvjvYM").unwrap(),
    ];
    allowed_payment_managers.contains(key)
}

pub const RECEIPT_MINT_MANAGER_SEED: &str = "receipt-mint-manager";
pub const RECEIPT_MINT_MANAGER_SIZE: usize = 8 + std::mem::size_of::<ReceiptMintManager>() + 8;
#[account]
pub struct ReceiptMintManager {
    // Canonical bump
    pub bump: u8,
}
