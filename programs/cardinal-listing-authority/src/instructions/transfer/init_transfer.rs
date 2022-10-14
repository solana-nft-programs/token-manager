use anchor_spl::token::TokenAccount;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitTransferIx {
    pub to: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: InitTransferIx)]
pub struct InitTransferCtx<'info> {
    #[account(
        init_if_needed,
        payer = payer,
        space = TRANSFER_SIZE,
        seeds = [TRANSFER_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    transfer: Box<Account<'info, Transfer>>,

    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = holder_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidHolderMintTokenAccount)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = holder.key() == holder_token_account.owner @ ErrorCode::InvalidHolder)]
    holder: Signer<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTransferCtx>, ix: InitTransferIx) -> Result<()> {
    let transfer = &mut ctx.accounts.transfer;
    transfer.bump = *ctx.bumps.get("transfer").unwrap();
    transfer.token_manager = ctx.accounts.token_manager.key();
    transfer.from = ctx.accounts.holder.key();
    transfer.to = ix.to;

    Ok(())
}
