use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Slot number is too large")]
    SlotNumberTooLarge,
    #[msg("Invalid issuer")]
    InvalidIssuer,
    #[msg("Invalid token manager")]
    InvalidTokenManager,
    #[msg("Must invalidate receipt")]
    MustInvalidateReceipt
}