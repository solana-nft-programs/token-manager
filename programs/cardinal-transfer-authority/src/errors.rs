use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid token manager for this transfer authority")]
    InvalidTokenManager,
    #[msg("Hodler token account does not match token manager recipient token account")]
    InvalidHolderTokenAccount,
    #[msg("Invalid token manager recipient")]
    InvalidRecipient,
}
