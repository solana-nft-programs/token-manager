use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode {
    #[msg("Invalid token manager for this rent receipt")]
    InvalidTokenManager,
}