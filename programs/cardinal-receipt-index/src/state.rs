use anchor_lang::prelude::*;

pub const RECEIPT_COUNTER_SEED: &str = "receipt-counter";
pub const RECEIPT_COUNTER_SIZE: usize = 8 + std::mem::size_of::<ReceiptCounter>(); 
#[account]
pub struct ReceiptCounter {
    pub bump: u8,
    pub count: u64,
}

pub const RECEIPT_SLOT_SEED: &str = "receipt-slot";
pub const RECEIPT_SLOT_SIZE: usize = 8 + std::mem::size_of::<ReceiptSlot>(); 
#[account]
pub struct ReceiptSlot {
    pub token_manager: Pubkey,
}

pub const RECEIPT_MARKER_SEED: &str = "receipt-marker";
pub const RECEIPT_MARKER_SIZE: usize = 8 + std::mem::size_of::<ReceiptMarker>(); 
#[account]
pub struct ReceiptMarker {
    pub bump: u8,
    pub receipt_manager: Option<Pubkey>
}
