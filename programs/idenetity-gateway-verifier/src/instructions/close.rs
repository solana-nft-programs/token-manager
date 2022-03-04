use anchor_lang::prelude::*;
use cardinal_token_manager::state::TokenManager;
use crate::state::GatewayValidator;

#[derive(Accounts)]
pub struct Close<'info>{
    // TODO: Is this vulnerable to abuse?
    #[account(constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManager)]
    token_manger: Box<Account<'info, TokenManager>>,

    #[account(
        mut,
        close = closer,
        seeds = [GATEWAY_VALIDATOR_SEED.as_bytes(), token_manager.key().as_ref()], bump = gateway_validator.bump,
    )]
    gateway_validator: Box<Account<'info, GatewayValidator>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn close(ctx: Context<Close>) -> ProgramResult{
    Ok(())
}
