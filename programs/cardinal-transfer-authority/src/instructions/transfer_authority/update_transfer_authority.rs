use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateTransferAuthorityIx {
    pub authority: Pubkey,
    pub allowed_marketplaces: Option<Vec<Pubkey>>,
}

#[derive(Accounts)]
#[instruction(ix: UpdateTransferAuthorityIx)]
pub struct UpdateTransferAuthorityCtx<'info> {
    #[account(mut)]
    transfer_authority: Box<Account<'info, TransferAuthority>>,
    #[account(mut, constraint = transfer_authority.authority == authority.key() @ ErrorCode::InvalidTransferAuthorityAuthority)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<UpdateTransferAuthorityCtx>, ix: UpdateTransferAuthorityIx) -> Result<()> {
    let transfer_authority = &mut ctx.accounts.transfer_authority;
    transfer_authority.authority = ix.authority;
    transfer_authority.allowed_marketplaces = ix.allowed_marketplaces;

    Ok(())
}
