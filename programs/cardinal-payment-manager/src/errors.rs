use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid collector")]
    InvalidCollector,
    #[msg("Invalid authority")]
    InvalidAuthority,
}
