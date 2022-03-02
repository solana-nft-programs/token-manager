use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{TokenAccount}}
};

#[derive(Accounts)]
#[instruction(mint: Pubkey, num_invalidators: u8)]
pub struct InitCtx<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref()], bump,
        space = token_manager_size(num_invalidators as usize),
    )]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    issuer: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
        issuer_token_account.owner == issuer.key()
        && issuer_token_account.mint == mint
        && issuer_token_account.amount >= 1
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    issuer_token_account: Box<Account<'info, TokenAccount>>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, mint: Pubkey,  num_invalidators: u8) -> Result<()> {
    if num_invalidators > MAX_INVALIDATORS {
        return Err(error!(ErrorCode::InvalidIssuerTokenAccount));
    }

    let token_manager = &mut ctx.accounts.token_manager;
    
    token_manager.bump = *ctx.bumps.get("token_manager").unwrap();
    token_manager.num_invalidators = num_invalidators;
    token_manager.issuer = ctx.accounts.issuer.key();
    token_manager.mint = mint;
    token_manager.state = TokenManagerState::Initialized as u8;
    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    // default to itself to avoid someone not setting it
    token_manager.transfer_authority = Some(token_manager.key());
    return Ok(())
}