use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Account not initialized")]
    Uninitialized,
    #[msg("Too many invalidators have already been added")]
    TooManyInvalidators,
    #[msg("Number of invalidators cannot be overwritten")]
    InvalidNumInvalidators,
    #[msg("Token account not owned by token manager")]
    InvalidTokenManagerTokenAccount,
    #[msg("Token account not owned by issuer")]
    InvalidIssuerTokenAccount,
    #[msg("Max invalidators reached")]
    MaximumInvalidatorsReached,
    #[msg("Token account not owned by recipient")]
    InvalidRecipientTokenAccount,
    #[msg("Token account not owned by invalidator")]
    InvalidInvalidatorTokenAccount,
    #[msg("Token manager kind is not valid")]
    InvalidTokenManagerKind,
    #[msg("Invalid invalidation type")]
    InvalidInvalidationType,
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
    InvalidTokenManagerState,
    #[msg("Outstanding tokens exist")]
    OutstandingTokens,
    #[msg("User must be freeze authority to create mint manager")]
    InvalidFreezeAuthority,
    #[msg("User must be initializer to close mint manager")]
    InvalidInitializer,
    #[msg("Invalid claim receipt")]
    InvalidClaimReceipt,
    #[msg("Invalid transfer receipt")]
    InvalidTransferReceipt,
    #[msg("Public key mismatch")]
    PublicKeyMismatch,
    #[msg("Invalid metadata program id")]
    InvalidMetadataProgramId,
    #[msg("Invalid receipt mint account")]
    InvalidReceiptMintAccount,
    #[msg("Invalid receipt mint owner")]
    InvalidReceiptMintOwner,
    #[msg("Invalid receipt mint")]
    InvalidReceiptMint,
    #[msg("Invalid current holder token account")]
    InvalidCurrentTokenAccount,
    #[msg("Invalid mint supply")]
    InvalidMintSupply,
    #[msg("Invalid account discriminator")]
    AccountDiscriminatorMismatch,
    #[msg("Invalidation type update only allowed between return and reissue")]
    InvalidationTypeUpdateDisallowed,
    #[msg("Claim approver must be set to use vesting invalidation type")]
    ClaimApproverMustBeSet,
    #[msg("Target token account is incorrect")]
    InvalidTargetTokenAccount,
    #[msg("Transaction included disallowed")]
    InstructionsDisallowed,
    #[msg("Invalidation type is not allowed with this token manager kind")]
    InvalidInvalidationTypeKindMatch,
    #[msg("Invalid Mint Authority")]
    InvalidMintAuthority,
    #[msg("Invalid Permissioned Reward Address")]
    InvalidPermissionedRewardAddress,
}
