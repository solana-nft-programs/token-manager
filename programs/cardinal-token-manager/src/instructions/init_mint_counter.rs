use {crate::state::*, anchor_lang::prelude::*};

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct InitMintCounterCtx<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [MINT_COUNTER_SEED.as_bytes(), mint.as_ref()], bump,
        space = MINT_COUNTER_SIZE,
    )]
    mint_counter: Box<Account<'info, MintCounter>>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitMintCounterCtx>, _mint: Pubkey) -> Result<()> {
    let mint_counter = &mut ctx.accounts.mint_counter;
    mint_counter.bump = *ctx.bumps.get("mint_counter").unwrap();
    mint_counter.count = 0;
    Ok(())
}
