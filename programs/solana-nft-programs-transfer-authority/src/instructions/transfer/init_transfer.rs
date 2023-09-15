use anchor_spl::token::TokenAccount;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use solana_nft_programs_token_manager::state::TokenManager;
use solana_nft_programs_token_manager::state::TokenManagerState;

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

    if ctx.accounts.holder_token_account.delegate.expect("Invalid delegate").key() != ctx.accounts.token_manager.key()
        || ctx.accounts.holder_token_account.delegated_amount != ctx.accounts.token_manager.amount
    {
        return Err(error!(ErrorCode::TokenNotDelegated));
    }

    Ok(())
}
