use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, TokenAccount},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitIx {
    pub amount: u64,
    pub kind: u8,
    pub invalidation_type: u8,
    pub num_invalidators: u8,
}

#[derive(Accounts)]
#[instruction(num_invalidators: u8)]
pub struct InitCtx<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [TOKEN_MANAGER_SEED.as_bytes(), mint.key().as_ref()], bump,
        space = token_manager_size(num_invalidators as usize),
    )]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        seeds = [MINT_COUNTER_SEED.as_bytes(), mint.key().as_ref()], bump,
        space = MINT_COUNTER_SIZE,
    )]
    mint_counter: Box<Account<'info, MintCounter>>,
    mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    issuer: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
        issuer_token_account.owner == issuer.key()
        && issuer_token_account.mint == mint.key()
        && issuer_token_account.amount >= 1
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    issuer_token_account: Box<Account<'info, TokenAccount>>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, ix: InitIx) -> Result<()> {
    if ix.num_invalidators > MAX_INVALIDATORS {
        return Err(error!(ErrorCode::MaximumInvalidatorsReached));
    }
    let token_manager = &mut ctx.accounts.token_manager;
    if token_manager.state != TokenManagerState::Initialized as u8 {
        return Err(error!(ErrorCode::InvalidTokenManagerState));
    }
    if token_manager.num_invalidators != 0 && ix.num_invalidators >= token_manager.num_invalidators {
        return Err(error!(ErrorCode::InvalidNumInvalidators));
    }
    if ctx.accounts.mint.supply > 1 {
        return Err(error!(ErrorCode::InvalidMintSupply));
    }
    if ix.kind != TokenManagerKind::Managed as u8 && ix.kind != TokenManagerKind::Unmanaged as u8 && ix.kind != TokenManagerKind::Edition as u8 {
        return Err(error!(ErrorCode::InvalidTokenManagerKind));
    }
    if ix.invalidation_type != InvalidationType::Return as u8
        && ix.invalidation_type != InvalidationType::Invalidate as u8
        && ix.invalidation_type != InvalidationType::Release as u8
        && ix.invalidation_type != InvalidationType::Reissue as u8
        && ix.invalidation_type != InvalidationType::Vest as u8
    {
        return Err(error!(ErrorCode::InvalidInvalidationType));
    }

    let mint_counter = &mut ctx.accounts.mint_counter;
    mint_counter.bump = *ctx.bumps.get("mint_counter").unwrap();
    mint_counter.count = mint_counter.count.checked_add(1).expect("Addition error");
    mint_counter.mint = ctx.accounts.mint.key();

    token_manager.bump = *ctx.bumps.get("token_manager").unwrap();
    token_manager.count = mint_counter.count;
    token_manager.num_invalidators = ix.num_invalidators;
    token_manager.issuer = ctx.accounts.issuer.key();
    token_manager.mint = ctx.accounts.mint.key();
    token_manager.state = TokenManagerState::Initialized as u8;
    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    token_manager.claim_approver = None;
    token_manager.invalidators = Vec::new();
    token_manager.amount = ix.amount;
    token_manager.kind = ix.kind;
    token_manager.invalidation_type = ix.invalidation_type;

    // default to itself to avoid someone not setting it
    token_manager.transfer_authority = Some(token_manager.key());
    Ok(())
}
