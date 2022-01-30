use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
#[instruction(seed: Vec<u8>, bump: u8, num_invalidators: u8)]
pub struct InitCtx<'info> {
    #[account(
        init,
        payer = issuer,
        seeds = [TOKEN_MANAGER_SEED.as_bytes(), issuer.key().as_ref(), &seed[..]], bump = bump,
        space = token_manager_size(num_invalidators as usize),
    )]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut)]
    issuer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitCtx>, _seed: Vec<u8>, bump: u8, num_invalidators: u8) -> ProgramResult {
    if num_invalidators > MAX_INVALIDATORS {
        return Err(ErrorCode::InvalidIssuerTokenAccount.into());
    }

    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.bump = bump;
    token_manager.num_invalidators = num_invalidators;
    token_manager.issuer = ctx.accounts.issuer.key();
    token_manager.state = TokenManagerState::Initialized as u8;
    return Ok(())
}