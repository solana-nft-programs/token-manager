use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub duration_seconds: Option<i64>,
    pub expiration: Option<i64>,
    pub extension_payment_amount: Option<u64>,
    pub extension_duration_seconds: Option<u64>,
    pub extension_payment_mint: Option<Pubkey>,
    pub max_expiration: Option<i64>,
    pub disable_partial_extension: Option<bool>
}

#[derive(Accounts)]
pub struct InitCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = TIME_INVALIDATOR_SIZE,
        seeds = [TIME_INVALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    #[account(mut, constraint = payer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
    if ix.duration_seconds == None && ix.expiration == None {
        return Err(error!(ErrorCode::InvalidInstruction));
    } else if (ix.extension_payment_amount == None && ix.extension_duration_seconds != None)
        || (ix.extension_payment_amount != None && ix.extension_duration_seconds == None)
    {
        return Err(error!(ErrorCode::InvalidInstruction));
    } else if ix.extension_payment_amount != None && ix.extension_payment_mint == None {
        return Err(error!(ErrorCode::InvalidInstruction));
    }
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    time_invalidator.bump = *ctx.bumps.get("time_invalidator").unwrap();
    time_invalidator.token_manager = ctx.accounts.token_manager.key();
    time_invalidator.duration_seconds = ix.duration_seconds;
    time_invalidator.expiration = ix.expiration;
    time_invalidator.extension_payment_amount = ix.extension_payment_amount;
    time_invalidator.extension_duration_seconds = ix.extension_duration_seconds;
    time_invalidator.extension_payment_mint = ix.extension_payment_mint;
    time_invalidator.max_expiration = ix.max_expiration;
    time_invalidator.disable_partial_extension = ix.disable_partial_extension;
    return Ok(());
}
