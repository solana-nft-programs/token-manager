use anchor_lang::prelude::*;

#[error]
pub enum ErrorCode{
    #[msg("Invalid token manager for this verifier")]
    InvalidTokenManager,
    #[msg("Invalid or non revoked gateway token provided token")]
    NonRevokedToken,
}
