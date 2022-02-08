use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*, AccountsClose},
    anchor_spl::{token::{self, Token, TokenAccount, Transfer, CloseAccount}}
};

#[derive(Accounts)]
pub struct UnissueCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Issued as u8)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = token_manager_token_account.owner == token_manager.key() @ ErrorCode::InvalidTokenManagerTokenAccount)]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,

    // issuer
    #[account(mut, constraint = token_manager.issuer == issuer.key() @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
    #[account(mut, constraint = issuer_token_account.owner == issuer.key() @ ErrorCode::InvalidIssuerTokenAccount)]
    issuer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<UnissueCtx>) -> ProgramResult {
    let token_manager = &ctx.accounts.token_manager;
        
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), token_manager.mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // transfer amount to destination token account
    let cpi_accounts = Transfer {
        from: ctx.accounts.token_manager_token_account.to_account_info(),
        to: ctx.accounts.issuer_token_account.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, token_manager.amount)?;

    // close token manager account
    ctx.accounts.token_manager.close(ctx.accounts.issuer.to_account_info())?;

    // close token account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.issuer.to_account_info(),
        authority: token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;
    return Ok(())
}
