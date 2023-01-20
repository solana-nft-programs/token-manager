use anchor_spl::token::{Mint, Token};
use mpl_token_metadata::instruction::create_master_edition_v3;
use solana_program::program::invoke_signed;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(Accounts)]
pub struct UnwrapCtx<'info> {
    #[account(mut, constraint = token_manager.kind == TokenManagerKind::Permissioned as u8 && token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,
    #[account(mut)]
    mint_manager: Box<Account<'info, MintManager>>,

    /// CHECK: Checked in CPI
    #[account(mut)]
    edition: UncheckedAccount<'info>,
    /// CHECK: Checked in CPI
    #[account(mut)]
    metadata: UncheckedAccount<'info>,

    #[account(mut)]
    authority: Signer<'info>,

    /// CHECK: Address is checked
    #[account(address = mpl_token_metadata::id())]
    token_metadata_program: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UnwrapCtx>) -> Result<()> {
    let path = &[MINT_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref()];
    let (key, _bump) = Pubkey::find_program_address(path, ctx.program_id);
    if key != ctx.accounts.mint_manager.key() {
        return Err(error!(ErrorCode::InvalidMintManager));
    }

    // if ctx.accounts.authority.key() != ctx.accounts.mint_manager.initializer {
    //     return Err(error!(ErrorCode::InvalidMigrateAuthority));
    // }

    let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.key().as_ref(), &[ctx.accounts.mint_manager.bump]];
    let mint_manager_signer = &[&mint_manager_seeds[..]];
    invoke_signed(
        &create_master_edition_v3(
            ctx.accounts.token_metadata_program.key(),
            ctx.accounts.edition.key(),
            ctx.accounts.mint.key(),
            ctx.accounts.authority.key(),
            ctx.accounts.mint_manager.key(),
            ctx.accounts.metadata.key(),
            ctx.accounts.authority.key(),
            Some(1),
        ),
        &[
            ctx.accounts.token_metadata_program.to_account_info(),
            ctx.accounts.edition.to_account_info(),
            ctx.accounts.mint.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.mint_manager.to_account_info(),
            ctx.accounts.metadata.to_account_info(),
            ctx.accounts.authority.to_account_info(),
        ],
        mint_manager_signer,
    )?;

    Ok(())
}
