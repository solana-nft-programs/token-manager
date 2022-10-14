use {crate::state::*, anchor_lang::prelude::*};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitTransferAuthorityIx {
    pub name: String,
    pub authority: Pubkey,
    pub allowed_marketplaces: Option<Vec<Pubkey>>,
}

#[derive(Accounts)]
#[instruction(ix: InitTransferAuthorityIx)]
pub struct InitTransferAuthorityCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = TRANSFER_AUTHORITY_SIZE,
        seeds = [TRANSFER_AUTHORITY_SEED.as_bytes(), ix.name.as_bytes()], bump,
    )]
    transfer_authority: Box<Account<'info, TransferAuthority>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTransferAuthorityCtx>, ix: InitTransferAuthorityIx) -> Result<()> {
    let transfer_authority = &mut ctx.accounts.transfer_authority;
    transfer_authority.bump = *ctx.bumps.get("transfer_authority").unwrap();
    transfer_authority.name = ix.name;
    transfer_authority.authority = ix.authority;
    transfer_authority.allowed_marketplaces = ix.allowed_marketplaces;

    Ok(())
}
