use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid fee collector token account")]
    InvalidFeeCollectorTokenAccount,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Invalid mint metadata")]
    InvalidMintMetadata,
    #[msg("Invalid creator address")]
    InvalidCreatorAddress,
}
