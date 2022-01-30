pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("cntQPZbfxBeLa8HVBbA4fApyAKh8mUxUVeaCjBLFSFP");

#[program]
pub mod cardinal_rental_counter {
    use super::*;

    pub fn increment(ctx: Context<IncrementCtx>, bump: u8) -> ProgramResult {
        increment::handler(ctx, bump)
    }
}