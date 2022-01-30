use {
    crate::{state::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
#[instruction(bump: u8)]
pub struct IncrementCtx<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = RENTAL_COUNTER_SIZE,
        seeds = [RENTAL_COUNTER_SEED.as_bytes(), user.key().as_ref()], bump = bump,
    )]
    rental_counter: Box<Account<'info, RentalCounter>>,
    user: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<IncrementCtx>, _bump: u8) -> ProgramResult {
    let rental_counter = &mut ctx.accounts.rental_counter;
    rental_counter.count += 1;
    return Ok(())
}