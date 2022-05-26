use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount, Transfer},
};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct HandlePaymentCtx<'info> {
    #[account(mut)]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut)]
    payer_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = fee_collector_token_account.owner == payment_manager.fee_collector @ ErrorCode::InvalidFeeCollectorTokenAccount)]
    fee_collector_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    payment_token_account: Box<Account<'info, TokenAccount>>,

    payer: Signer<'info>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<HandlePaymentCtx>, payment_amount: u64) -> Result<()> {
    let payment_manager = &mut ctx.accounts.payment_manager;

    let maker_fee = payment_amount
        .checked_mul(payment_manager.maker_fee)
        .unwrap()
        .checked_div((10_u64).checked_pow(payment_manager.fee_decimals).unwrap())
        .expect("Division error");
    let taker_fee = payment_amount
        .checked_mul(payment_manager.taker_fee)
        .unwrap()
        .checked_div((10_u64).checked_pow(payment_manager.fee_decimals).unwrap())
        .expect("Division error");

    if maker_fee.checked_add(taker_fee).expect("Add error") > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.fee_collector_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, maker_fee.checked_add(taker_fee).expect("Add error"))?;
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.payment_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, payment_amount.checked_sub(maker_fee).expect("Sub error"))?;

    Ok(())
}
