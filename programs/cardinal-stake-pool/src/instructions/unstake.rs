use {
    crate::{state::*},
    anchor_lang::{prelude::*},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UnstakeIx {
    bump: u8,
}

#[derive(Accounts)]
#[instruction(ix: UnstakeIx)]
pub struct UnstakeCtx<'info> {
    #[account(mut)]
    stake_entry: Box<Account<'info, StakeEntry>>,

    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UnstakeCtx>, ix: UnstakeIx) -> Result<()> {
    return Ok(())
}