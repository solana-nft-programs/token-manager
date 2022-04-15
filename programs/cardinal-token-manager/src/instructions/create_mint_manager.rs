use anchor_spl::token::{self, Mint, SetAuthority, Token};
use spl_token::instruction::AuthorityType;
use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct CreateMintManagerCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = MINT_MANAGER_SIZE,
        seeds = [MINT_MANAGER_SEED.as_bytes(), mint.key().as_ref()],
        bump,
    )]
    pub mint_manager: Account<'info, MintManager>,
    #[account(mut, constraint = mint.freeze_authority.expect("No freeze authority") == freeze_authority.key() @ ErrorCode::InvalidFreezeAuthority)]
    pub mint: Account<'info, Mint>,
    pub freeze_authority: Signer<'info>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateMintManagerCtx>) -> Result<()> {
    // set mint manager data
    let mint_manager = &mut ctx.accounts.mint_manager;
    mint_manager.initializer = ctx.accounts.freeze_authority.key();
    mint_manager.token_managers = 0;
    mint_manager.bump = *ctx.bumps.get("mint_manager").unwrap();

    // set freeze authority of mint to mint manager
    let cpi_accounts = SetAuthority {
        account_or_mint: ctx.accounts.mint.to_account_info(),
        current_authority: ctx.accounts.freeze_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::set_authority(cpi_context, AuthorityType::FreezeAccount, Some(ctx.accounts.mint_manager.key()))?;
    Ok(())
}
