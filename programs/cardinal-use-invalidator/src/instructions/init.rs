use {
    crate::{state::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub total_usages: Option<u64>,
    pub max_usages: Option<u64>,
    pub use_authority: Option<Pubkey>,
    pub extension_payment_amount: Option<u64>,
    pub extension_payment_mint: Option<Pubkey>,
    pub extension_usages: Option<u64>,
}

#[derive(Accounts)]
pub struct InitCtx<'info> {
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = USE_INVALIDATOR_SIZE,
        seeds = [USE_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut)]
    user: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
    let use_invalidator = &mut ctx.accounts.use_invalidator;
    use_invalidator.bump = *ctx.bumps.get("use_invalidator").unwrap();
    use_invalidator.token_manager = ctx.accounts.token_manager.key();
    if ctx.accounts.token_manager.state == TokenManagerState::Initialized as u8 && ctx.accounts.user.key() == ctx.accounts.token_manager.issuer {
        use_invalidator.total_usages = ix.total_usages;
        use_invalidator.max_usages = ix.max_usages;
        use_invalidator.use_authority = ix.use_authority;
        use_invalidator.extension_payment_amount = ix.extension_payment_amount;
        use_invalidator.extension_payment_mint = ix.extension_payment_mint;
        use_invalidator.extension_usages = ix.extension_usages;
    }
    return Ok(())
}