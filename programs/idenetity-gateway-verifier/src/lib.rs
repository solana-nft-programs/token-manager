pub mod instructions;
pub mod state;
pub mod errors;

use anchor_lang::prelude::*;
use instructions::*;

// TODO: Upload this and replace id         1
declare_id!("22222222222222222222222222222222");

#[program]
pub mod identity_gateway_validator{
    use super::*;

    pub fn init(ctx: Context<Init>, network: Pubkey) -> ProgramResult{
        init::init(ctx, network)
    }

    pub fn invalidate(ctx: Context<Invalidate>) -> ProgramResult{
        invalidate::invalidate(ctx)
    }

    pub fn close(ctx: Context<Close>) -> ProgramResult{
        close::close(ctx)
    }
}
