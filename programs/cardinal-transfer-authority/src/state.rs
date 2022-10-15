use crate::errors::ErrorCode;
use anchor_lang::prelude::*;

pub const TRANSFER_AUTHORITY_SEED: &str = "transfer-authority";
pub const TRANSFER_AUTHORITY_SIZE: usize = 8 + 1 + 24 + 32 + 32 * 5 + 64;
#[account]
pub struct TransferAuthority {
    pub bump: u8,
    pub name: String,
    pub authority: Pubkey,
    pub allowed_marketplaces: Option<Vec<Pubkey>>,
}

pub const MARKETPLACE_SEED: &str = "marketplace";
pub const MARKETPLACE_SIZE: usize = 8 + 1 + 24 + 32 + 32 + 32 * 5 + 64;
#[account]
pub struct Marketplace {
    pub bump: u8,
    pub name: String,
    pub transfer_authority: Pubkey,
    pub payment_manager: Pubkey,
    pub authority: Pubkey,
    pub payment_mints: Option<Vec<Pubkey>>,
}

pub const LISTING_SEED: &str = "listing";
pub const LISTING_SIZE: usize = 8 + std::mem::size_of::<Listing>() + 64;
#[account]
pub struct Listing {
    pub bump: u8,
    pub lister: Pubkey,
    pub token_manager: Pubkey,
    pub marketplace: Pubkey,
    // payment
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
}

pub const TRANSFER_SEED: &str = "transfer";
pub const TRANSFER_SIZE: usize = 8 + std::mem::size_of::<Transfer>() + 64;
#[account]
pub struct Transfer {
    pub bump: u8,
    pub token_manager: Pubkey,
    pub from: Pubkey,
    pub to: Pubkey,
}

pub fn assert_derivation(program_id: &Pubkey, account: &AccountInfo, path: &[&[u8]]) -> Result<u8> {
    let (key, bump) = Pubkey::find_program_address(path, program_id);
    if key != *account.key {
        return Err(ErrorCode::InvalidDerivation.into());
    }
    Ok(bump)
}
