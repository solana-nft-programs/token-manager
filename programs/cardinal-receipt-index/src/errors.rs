use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Slot number is too large")]
    SlotNumberTooLarge,
    #[msg("Invalid issuer")]
    InvalidIssuer,
    #[msg("Invalid token manager")]
    InvalidTokenManager,
    #[msg("Must invalidate receipt")]
    MustInvalidateReceipt,
    #[msg("Token manager kind is not valid")]
    InvalidTokenManagerKind,
    #[msg("Invalid invalidation type")]
    InvalidInvalidationType,
}