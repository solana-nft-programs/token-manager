use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{self, Token, Mint, TokenAccount, Transfer}}
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct IssueIx {
    pub bump: u8,
    pub amount: u64,
    pub kind: u8,
    pub payment_collector: Option<Pubkey>,
    pub claim_authority: Option<Pubkey>,
    pub transfer_authority: Option<Pubkey>,
    pub invalidators: Vec<Pubkey>,
}

#[derive(Accounts)]
#[instruction(ix: IssueIx)]
pub struct IssueCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = token_manager_size(ix.invalidators.len()),
        seeds = [TOKEN_MANAGER_SEED.as_bytes(), mint.key().as_ref()], bump = ix.bump,
    )]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = token_manager_token_account.owner == token_manager.key() @ ErrorCode::InvalidTokenManagerTokenAccount)]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,

    // issuer
    issuer: Signer<'info>,
    #[account(mut, constraint = issuer_token_account.owner == issuer.key() @ ErrorCode::InvalidIssuerTokenAccount)]
    issuer_token_account: Box<Account<'info, TokenAccount>>,

    mint: Box<Account<'info, Mint>>,

    // other
    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<IssueCtx>, ix: IssueIx) -> ProgramResult {
    if ix.kind != TokenManagerKind::Managed as u8 && ix.kind != TokenManagerKind::Unmanaged as u8{
        return Err(ErrorCode::InvalidTokenManagerKind.into());
    }
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.bump = ix.bump;
    token_manager.issuer = ctx.accounts.issuer.key();
    token_manager.mint = ctx.accounts.mint.key();
    token_manager.amount = ix.amount;
    token_manager.kind = ix.kind;
    token_manager.state = TokenManagerState::Issued as u8;
    token_manager.payment_collector = ix.payment_collector;
    token_manager.claim_authority = ix.claim_authority;
    token_manager.transfer_authority = ix.transfer_authority;
    token_manager.invalidators = ix.invalidators;

    // transfer token to token manager token account
    let cpi_accounts = Transfer {
        from: ctx.accounts.issuer_token_account.to_account_info(),
        to: ctx.accounts.token_manager_token_account.to_account_info(),
        authority: ctx.accounts.issuer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, token_manager.amount)?;
    return Ok(())
}