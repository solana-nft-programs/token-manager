use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct ManagePaymentCtx<'info> {
    #[account(mut)]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut)]
    payer_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = collector_token_account.owner.key() == payment_manager.collector @ ErrorCode::InvalidCollector)]
    collector_token_account: Box<Account<'info, TokenAccount>>,

    payer: Signer<'info>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ManagePaymentCtx>, payment_amount: u64) -> Result<()> {
    let payment_manager = &mut ctx.accounts.payment_manager;

    let maker_fee = payment_amount
        .checked_mul(payment_manager.maker_fee.checked_div(payment_manager.fee_scale).expect("Division error"))
        .expect("Multiplication error");
    let taker_fee = payment_amount
        .checked_mul(payment_manager.taker_fee.checked_div(payment_manager.fee_scale).expect("Division error"))
        .expect("Multiplication error");

    if maker_fee.checked_add(taker_fee).expect("Add error") > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.collector_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, maker_fee.checked_add(taker_fee).expect("Add error"))?;
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.collector_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, payment_amount.checked_sub(taker_fee).expect("Sub error"))?;

    Ok(())
}
