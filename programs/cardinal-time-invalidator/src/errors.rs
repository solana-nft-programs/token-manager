use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Token account not owned by the claim approver")]
    InvalidPaymentTokenAccount,
    #[msg("Invalid issuer")]
    InvalidIssuer,
    #[msg("Invalid token manager for this claim approver")]
    InvalidTokenManager,
    #[msg("Expiration has not passed yet")]
    InvalidExpiration,
    #[msg("Invalid time invalidator")]
    InvalidTimeInvalidator,
    #[msg("Invalid instruction")]
    InvalidInstruction,
}