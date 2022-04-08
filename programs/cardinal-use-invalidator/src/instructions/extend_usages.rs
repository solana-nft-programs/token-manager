use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount, Transfer},
    cardinal_token_manager::{
        state::{assert_payment_manager, TokenManager, TokenManagerState, FEE_SCALE, PROVIDER_FEE, RECIPIENT_FEE},
        utils::assert_payment_token_account,
    },
};

#[derive(Accounts)]
pub struct ExtendUsagesCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = use_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidUseInvalidator)]
    use_invalidator: Box<Account<'info, UseInvalidator>>,

    #[account(mut, constraint = payment_token_account.mint == use_invalidator.extension_payment_mint.unwrap() @ ErrorCode::InvalidPaymentTokenAccount)]
    payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint =
        payment_manager_token_account.mint == use_invalidator.extension_payment_mint.unwrap()
        && payment_manager_token_account.owner == use_invalidator.payment_manager
        && assert_payment_manager(&payment_manager_token_account.owner)
        @ ErrorCode::InvalidPaymentManagerTokenAccount
    )]
    payment_manager_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
        payer_token_account.owner == payer.key()
        && payer_token_account.mint == use_invalidator.extension_payment_mint.unwrap()
        @ ErrorCode::InvalidPayerTokenAccount
    )]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ExtendUsagesCtx>, payment_amount: u64) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    assert_payment_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;

    let use_invalidator = &mut ctx.accounts.use_invalidator;
    if use_invalidator.extension_payment_amount == None || use_invalidator.extension_usages == None || use_invalidator.extension_payment_mint == None || use_invalidator.total_usages == None {
        return Err(error!(ErrorCode::InvalidUseInvalidator));
    }

    if payment_amount % use_invalidator.extension_payment_amount.unwrap() != 0 {
        return Err(error!(ErrorCode::InvalidExtensionAmount));
    }
    // floors any u64 decimals
    let usages_to_add = payment_amount
        .checked_mul(use_invalidator.extension_usages.unwrap())
        .unwrap()
        .checked_div(use_invalidator.extension_payment_amount.unwrap())
        .unwrap();
    let new_total_usages = Some(use_invalidator.total_usages.unwrap().checked_add(usages_to_add).unwrap());
    if new_total_usages > use_invalidator.max_usages {
        return Err(error!(ErrorCode::MaxUsagesReached));
    }

    let provider_fee = use_invalidator.extension_payment_amount.unwrap().checked_mul(PROVIDER_FEE.checked_div(FEE_SCALE).unwrap()).unwrap();
    let recipient_fee = use_invalidator.extension_payment_amount.unwrap().checked_mul(RECIPIENT_FEE.checked_div(FEE_SCALE).unwrap()).unwrap();
    if provider_fee.checked_add(recipient_fee).unwrap() > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.payment_manager_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, provider_fee.checked_add(recipient_fee).unwrap())?;
    }

    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.payment_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, payment_amount.checked_sub(recipient_fee).unwrap())?;

    use_invalidator.total_usages = new_total_usages;
    Ok(())
}
