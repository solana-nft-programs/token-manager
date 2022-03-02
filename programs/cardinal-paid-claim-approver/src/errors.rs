use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Token account not owned by the claim approver")]
    InvalidPaymentTokenAccount,
    #[msg("Token account not owned by the payer")]
    InvalidPayerTokenAccount,
    #[msg("Invalid token manager for this claim approver")]
    InvalidTokenManager,
}