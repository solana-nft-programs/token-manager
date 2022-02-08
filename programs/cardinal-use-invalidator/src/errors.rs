use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Token account not owned by the claim approver")]
    InvalidPaymentTokenAccount,
    #[msg("Token account not owned by the issuer")]
    InvalidTokenAccount,
    #[msg("User is not permitted to use")]
    InvalidUser,
    #[msg("Invalid token manager for this claim approver")]
    InvalidTokenManager,
    #[msg("Usages at the maximum")]
    InsufficientUsages
}