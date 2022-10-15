use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct WhitelistMarketplacesIx {
    pub allowed_marketplaces: Vec<Pubkey>,
}

#[derive(Accounts)]
#[instruction(ix: WhitelistMarketplacesIx)]
pub struct WhitelistMarketplacesCtx<'info> {
    #[account(mut)]
    transfer_authority: Box<Account<'info, TransferAuthority>>,

    #[account(mut, constraint = authority.key() == transfer_authority.authority @ ErrorCode::InvalidTransferAuthority)]
    authority: Signer<'info>,
}

pub fn handler(ctx: Context<WhitelistMarketplacesCtx>, ix: WhitelistMarketplacesIx) -> Result<()> {
    let transfer_authority = &mut ctx.accounts.transfer_authority;

    if ix.allowed_marketplaces.is_empty() {
        transfer_authority.allowed_marketplaces = None;
    } else {
        transfer_authority.allowed_marketplaces = Some(ix.allowed_marketplaces);
    }

    Ok(())
}
