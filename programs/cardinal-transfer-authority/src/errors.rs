use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid token manager for this transfer authority")]
    InvalidTokenManager,
    #[msg("Invalid lister")]
    InvalidLister,
    #[msg("Invalid payment mint")]
    InvalidPaymentMint,
    #[msg("Invalid marketplace")]
    InvalidMarketplace,
    #[msg("Invalid buyer payment token account")]
    InvalidBuyerPaymentTokenAccount,
    #[msg("Invalid buyer mint token account")]
    InvalidBuyerMintTokenAccount,
    #[msg("Invalid offer token account")]
    InvalidOfferTokenAccount,
    #[msg("Invalid payment manager")]
    InvalidPaymentManager,
    #[msg("Invalid mint")]
    InvalidMint,
    #[msg("Invalid fee collector")]
    InvalidFeeCollector,
    #[msg("Invalid lister payment token account")]
    InvalidListerPaymentTokenAccount,
    #[msg("Invalid lister mint token account")]
    InvalidListerMintTokenAccount,
    #[msg("Invalid marketplace authority")]
    InvalidMarketplaceAuthority,
    #[msg("Invalid transfer authority authority")]
    InvalidTransferAuthorityAuthority,
    #[msg("Invalid transfer authority")]
    InvalidTransferAuthority,
    #[msg("Marketplace place not allowed by transfer authority")]
    MarketplaceNotAllowed,
    #[msg("Invalid token holder")]
    InvalidHolder,
    #[msg("Invalid holder token account")]
    InvalidHolderMintTokenAccount,
    #[msg("Invalid transfer account")]
    InvalidTransfer,
    #[msg("Invalid recipient")]
    InvalidRecipient,
    #[msg("Invalid recipient mint token account")]
    InvalidRecipientMintTokenAccount,
    #[msg("Invalid derivation")]
    InvalidDerivation,
    #[msg("Transaction included disallowed")]
    InstructionsDisallowed,
    #[msg("Token must be delegated")]
    TokenNotDelegated,
    #[msg("Listing payment amount or mint has changed")]
    ListingChanged,
    #[msg("Invalid remaining accounts size")]
    InvalidRemainingAccountsSize,
    #[msg("Invalid payer payment token account")]
    InvalidPayerPaymentTokenAccount,
}
