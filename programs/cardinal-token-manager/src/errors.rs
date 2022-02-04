use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Account not initialized")]
    Uninitialized,
    #[msg("Too many invalidators have already been added")]
    TooManyInvalidators,
    #[msg("Token account not owned by token manager")]
    InvalidTokenManagerTokenAccount,
    #[msg("Token account not owned by issuer")]
    InvalidIssuerTokenAccount,
    #[msg("Token account not owned by recipient")]
    InvalidRecipientTokenAccount,
    #[msg("Token account not owned by invalidator")]
    InvalidInvalidatorTokenAccount,
    #[msg("Token manager kind is not valid")]
    InvalidTokenManagerKind,
    #[msg("Invalid claim authority")]
    InvalidClaimAuthority,
    #[msg("Invalid transfer authority")]
    InvalidTransferAuthority,
    #[msg("Invalid issuer")]
    InvalidIssuer,
    #[msg("Invalid invalidator")]
    InvalidInvalidator,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid token manager state")]
    InvalidTokenManagerState
}