use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Token account not owned by the use invalidator")]
    InvalidPaymentTokenAccount,
    #[msg("Token account not owned by the issuer")]
    InvalidPayerTokenAccount,
    #[msg("Token account not owned by the issuer")]
    InvalidTokenAccount,
    #[msg("User is not permitted to use")]
    InvalidUser,
    #[msg("Invalid token manager for this use invalidator")]
    InvalidTokenManager,
    #[msg("Usages at the maximum")]
    InsufficientUsages,
    #[msg("Invalid use invalidator")]
    InvalidUseInvalidator,
    #[msg("Max usages reached")]
    MaxUsagesReached,
    #[msg("Extension must be a multiple of extension payment")]
    InvalidExtensionAmount,
    #[msg("Token account incorrect mint")]
    InvalidPaymentManagerTokenAccount,
    #[msg("Invalid collector")]
    InvalidCollector,
    #[msg("Invalid payment manager program")]
    InvalidPaymentManagerProgram,
    #[msg("Invalid payment manager")]
    InvalidPaymentManager,
    #[msg("Invalid payment mint")]
    InvalidPaymentMint,
    #[msg("Invalid mint")]
    InvalidMint,
}
