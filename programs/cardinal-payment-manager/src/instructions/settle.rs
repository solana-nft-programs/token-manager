use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{self, Token, TokenAccount, Transfer, CloseAccount}},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState}},
};

#[derive(Accounts)]
pub struct SettleCtx<'info> {
    #[account(constraint =
        payment_manager.key() == token_manager.payment_mint.unwrap()
        && token_manager.state == TokenManagerState::Invalidated as u8
        @ ErrorCode::InvalidTokenManager
    )]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint =
        payment_manager_token_account.owner == payment_manager.key()
        && payment_manager_token_account.mint == payment_manager.payment_mint
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    issuer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, constraint =
        payment_manager_token_account.owner == payment_manager.key()
        && payment_manager_token_account.mint == payment_manager.payment_mint
        @ ErrorCode::InvalidPaymentTokenAccount
    )]
    payment_manager_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut, close = invalidator)]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut)]
    invalidator: Signer<'info>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<SettleCtx>) -> ProgramResult {
    let token_manager_key = ctx.accounts.token_manager.key();
    let payment_manager_seeds = &[PAYMENT_MANAGER_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.payment_manager.bump]];
    let payment_manager_signer = &[&payment_manager_seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.payment_manager_token_account.to_account_info(),
        to: ctx.accounts.payment_manager_token_account.to_account_info(),
        authority: ctx.accounts.payment_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(payment_manager_signer);
    token::transfer(cpi_context, ctx.accounts.payment_manager_token_account.amount)?;

    // close token account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.payment_manager_token_account.to_account_info(),
        destination: ctx.accounts.invalidator.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(payment_manager_signer);
    token::close_account(cpi_context)?;
    return Ok(())
}