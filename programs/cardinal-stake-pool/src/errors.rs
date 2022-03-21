use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Original mint is invalid")]
    InvalidOriginalMint,
    #[msg("Token Manager mint is invalid")]
    InvalidTokenManagerMint,
    #[msg("Invalid user original mint token account")]
    InvalidUserOriginalMintTokenAccount,
    #[msg("Invalid user token manager mint account")]
    InvalidUserTokenManagerMintTokenAccount,
    #[msg("Invalid stake entry original mint token account")]
    InvalidStakeEntryOriginalMintTokenAccount,
    #[msg("Invalid stake entry token manager mint token account")]
    InvalidStakeEntryTokenManagerMintTokenAccount,
}