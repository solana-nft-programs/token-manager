use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{self, Token, TokenAccount, Transfer}},
    cardinal_token_manager::{state::TokenManager},
    cardinal_payment_manager::{state::PaymentManager},
};

#[derive(Accounts)]
pub struct PayCtx<'info> {
    #[account(constraint = claim_approver.key() == token_manager.claim_approver.unwrap() @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut, constraint =
        payment_manager_token_account.owner == token_manager.payment_manager.unwrap()
        && payment_manager_token_account.mint == payment_manager.payment_mint
        @ ErrorCode::InvalidPaymentTokenAccount,
    )]
    payment_manager_token_account: Box<Account<'info, TokenAccount>>,

    // todo yes?
    #[account(mut, close = payer)]
    claim_approver: Box<Account<'info, PaidClaimApprover>>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
        payer_token_account.owner == payer.key()
        && payer_token_account.mint == payment_manager.payment_mint
        @ ErrorCode::InvalidPayerTokenAccount
    )]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<PayCtx>) -> ProgramResult {
    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.payment_manager_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, ctx.accounts.claim_approver.payment_amount)?;

    return Ok(())
}