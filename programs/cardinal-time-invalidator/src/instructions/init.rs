use {
    crate::{errors::*, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub duration: Option<i64>,
    pub expiration: Option<i64>,
    pub extension_payment_amount: Option<u64>,
    pub extension_duration: Option<u64>,
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

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> ProgramResult {
    if ix.duration == None && ix.expiration == None {
        return Err(ErrorCode::InvalidInstruction.into());
    }
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    time_invalidator.bump = *ctx.bumps.get("time_invalidator").unwrap();
    time_invalidator.token_manager = ctx.accounts.token_manager.key();
    time_invalidator.duration = ix.duration;
    time_invalidator.expiration = ix.expiration;
    time_invalidator.extension_payment_amount = ix.extension_payment_amount;
    time_invalidator.extension_duration = ix.extension_duration;
    return Ok(());
}
