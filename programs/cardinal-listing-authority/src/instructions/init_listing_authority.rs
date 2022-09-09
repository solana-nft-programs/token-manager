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
        space = LISTING_AUTHORITY_SIZE,
        seeds = [LISTING_AUTHORITY_SEED.as_bytes(), ix.name.as_bytes()], bump,
    )]
    listing_authority: Box<Account<'info, ListingAuthority>>,
    #[account(mut)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitTransferAuthorityCtx>, ix: InitTransferAuthorityIx) -> Result<()> {
    let listing_authority = &mut ctx.accounts.listing_authority;
    listing_authority.bump = *ctx.bumps.get("listing_authority").unwrap();
    listing_authority.name = ix.name;
    listing_authority.authority = ix.authority;
    listing_authority.allowed_marketplaces = ix.allowed_marketplaces;

    Ok(())
}
