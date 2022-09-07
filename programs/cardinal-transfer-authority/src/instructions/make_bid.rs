use anchor_spl::token::TokenAccount;

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitTransferAuthorityIx {
    pub collector: Pubkey,
    pub payment_amount: Option<u64>,
    pub payment_mint: Option<Pubkey>,
    pub payment_manager: Option<Pubkey>,
}

#[derive(Accounts)]
#[instruction(ix: InitIx)]
pub struct InitTransferAuthorityCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = TRANSFER_AUTHORITY_SIZE,
        seeds = [TRANSFER_AUTHORITY_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    transfer_authority: Box<Account<'info, TransferAuthority>>,

    #[account(mut, constraint = holder_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidHolderTokenAccount)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = holder.key() == holder_token_account.owner @ ErrorCode::InvalidRecipient)]
    holder: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTransferAuthorityCtx>, ix: InitIx) -> Result<()> {
    let transfer_authority = &mut ctx.accounts.transfer_authority;
    transfer_authority.bump = *ctx.bumps.get("transfer_authority").unwrap();
    transfer_authority.payment_manager = ix.payment_manager;
    Ok(())
}
