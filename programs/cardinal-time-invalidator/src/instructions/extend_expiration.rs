use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer},
    cardinal_payment_manager::program::CardinalPaymentManager,
    cardinal_token_manager::{
        state::{TokenManager, TokenManagerState},
        utils::assert_payment_token_account,
    },
    std::cmp::max,
};

#[derive(Accounts)]
pub struct ExtendExpirationCtx<'info> {
    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint = time_invalidator.token_manager == token_manager.key() @ ErrorCode::InvalidTimeInvalidator)]
    time_invalidator: Box<Account<'info, TimeInvalidator>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut, constraint = payment_manager.key() == time_invalidator.payment_manager @ ErrorCode::InvalidPaymentManager)]
    payment_manager: UncheckedAccount<'info>,

    #[account(mut, constraint = payment_token_account.mint == time_invalidator.extension_payment_mint.expect("No extension mint") @ ErrorCode::InvalidPaymentTokenAccount)]
    payment_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = fee_collector_token_account.mint == time_invalidator.extension_payment_mint.unwrap() @ ErrorCode::InvalidPaymentMint)]
    fee_collector_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    payer: Signer<'info>,
    #[account(mut, constraint =
      payer_token_account.owner == payer.key()
      && payer_token_account.mint == time_invalidator.extension_payment_mint.expect("No extension mint")
      @ ErrorCode::InvalidPayerTokenAccount
    )]
    payer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
    cardinal_payment_manager: Program<'info, CardinalPaymentManager>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ExtendExpirationCtx<'info>>, seconds_to_add: u64) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    assert_payment_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;

    let token_manager = &mut ctx.accounts.token_manager;
    let time_invalidator = &mut ctx.accounts.time_invalidator;
    if time_invalidator.extension_payment_amount == None || time_invalidator.extension_duration_seconds == None || time_invalidator.extension_payment_mint == None {
        return Err(error!(ErrorCode::InvalidTimeInvalidator));
    }

    let price_to_pay = seconds_to_add
        .checked_mul(time_invalidator.extension_payment_amount.expect("No extension amount"))
        .expect("Multiplication error")
        .checked_div(time_invalidator.extension_duration_seconds.expect("No extension duration"))
        .expect("Division error");

    if price_to_pay == 0 && time_invalidator.extension_payment_amount.unwrap() > 0 {
        return Err(error!(ErrorCode::InvalidExtensionAmount));
    }
    msg!("Extending by {:?} seconds by paying {:?}", seconds_to_add, price_to_pay);

    if time_invalidator.disable_partial_extension != None
        && time_invalidator.disable_partial_extension.unwrap()
        && seconds_to_add
            .checked_rem(time_invalidator.extension_duration_seconds.expect("No extension duration"))
            .expect("Remainder error")
            != 0
    {
        return Err(error!(ErrorCode::InvalidExtensionAmount));
    }

    let mut expiration = token_manager
        .state_changed_at
        .checked_add(time_invalidator.duration_seconds.expect("No duration set"))
        .expect("Add error");
    if time_invalidator.expiration != None {
        expiration = max(expiration, time_invalidator.expiration.unwrap());
    }
    let new_expiration = Some(expiration.checked_add(seconds_to_add as i64).expect("Addition error"));

    if time_invalidator.max_expiration != None && new_expiration > time_invalidator.max_expiration {
        return Err(error!(ErrorCode::InvalidExtendExpiration));
    }

    if ctx.accounts.payment_manager.owner.key() == ctx.accounts.cardinal_payment_manager.key() {
        let payment_mint_info = next_account_info(remaining_accs)?;
        let payment_mint = Account::<Mint>::try_from(payment_mint_info)?;
        if time_invalidator.extension_payment_mint.unwrap() != payment_mint.key() {
            return Err(error!(ErrorCode::InvalidPaymentMint));
        }

        let mint_info = next_account_info(remaining_accs)?;
        let mint = Account::<Mint>::try_from(mint_info)?;
        if token_manager.mint != mint.key() {
            return Err(error!(ErrorCode::InvalidMint));
        }
        let mint_metadata_info = next_account_info(remaining_accs)?;

        let cpi_accounts = cardinal_payment_manager::cpi::accounts::HandlePaymentWithRoyaltiesCtx {
            payment_manager: ctx.accounts.payment_manager.to_account_info(),
            payer_token_account: ctx.accounts.payer_token_account.to_account_info(),
            fee_collector_token_account: ctx.accounts.fee_collector_token_account.to_account_info(),
            payment_token_account: ctx.accounts.payment_token_account.to_account_info(),
            payment_mint: payment_mint.to_account_info(),
            mint: mint.to_account_info(),
            mint_metadata: mint_metadata_info.to_account_info(),
            payer: ctx.accounts.payer.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
        cardinal_payment_manager::cpi::handle_payment_with_royalties(cpi_ctx, price_to_pay)?;
    } else {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.payment_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, price_to_pay)?;
    }

    time_invalidator.expiration = new_expiration;
    Ok(())
}
