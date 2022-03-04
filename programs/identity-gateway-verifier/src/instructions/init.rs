use std::ops::DerefMut;
use anchor_lang::prelude::*;
use cardinal_token_manager::state::TokenManager;
use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(network: Pubkey)]
pub struct Init<'info>{
    #[account(
        init_if_needed,
        payer = payer,
        space = GatewayValidator::SIZE,
        seeds = [GATEWAY_VALIDATOR_SEED, network.as_ref()], bump,
    )]
    gateway_verifier: Box<Account<'info, GatewayValidator>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn init(ctx: Context<Init>, network: Pubkey) -> ProgramResult{
    *ctx.accounts.gateway_verifier.deref_mut().deref_mut() = GatewayValidator{
        bump: *ctx.bumps.get("gateway_verifier").unwrap(),
        network,
    };
    Ok(())
}
