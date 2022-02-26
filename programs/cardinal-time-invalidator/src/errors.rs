use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Token account not owned by the claim approver")]
    InvalidPaymentTokenAccount,
    #[msg("Token account not owned by the issuer")]
    InvalidIssuerTokenAccount,
    #[msg("Invalid token manager for this claim approver")]
    InvalidTokenManager,
    #[msg("Expiration has not passed yet")]
    InvalidExpiration,
    #[msg("Invalid time invalidator")]
    InvalidTimeInvalidator
}