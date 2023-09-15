use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerState;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub collector: Pubkey,
    pub payment_manager: Pubkey,
    pub total_usages: Option<u64>,
    pub max_usages: Option<u64>,
    pub use_authority: Option<Pubkey>,
    pub extension_payment_amount: Option<u64>,
    pub extension_payment_mint: Option<Pubkey>,
    pub extension_usages: Option<u64>,
}

#[derive(Accounts)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = USE_INVALIDATOR_SIZE,
        seeds = [USE_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    use_invalidator.bump = *ctx.bumps.get("use_invalidator").unwrap();
    use_invalidator.token_manager = ctx.accounts.token_manager.key();
    use_invalidator.collector = ix.collector;
    use_invalidator.payment_manager = ix.payment_manager;
    use_invalidator.usages = 0;
    use_invalidator.total_usages = ix.total_usages;
    use_invalidator.max_usages = ix.max_usages;
    use_invalidator.use_authority = ix.use_authority;
    use_invalidator.extension_payment_amount = ix.extension_payment_amount;
    use_invalidator.extension_payment_mint = ix.extension_payment_mint;
    use_invalidator.extension_usages = ix.extension_usages;
    Ok(())
}
