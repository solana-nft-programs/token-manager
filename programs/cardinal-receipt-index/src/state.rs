use anchor_lang::prelude::*;

pub const RECEIPT_MARKER_SEED: &str = "receipt-marker";
pub const RECEIPT_MARKER_SIZE: usize = 8 + std::mem::size_of::<ReceiptMarker>(); 
#[account]
pub struct ReceiptMarker {
    pub bump: u8,
    pub receipt_manager: Pubkey
}
