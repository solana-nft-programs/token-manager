use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::Token,
    cardinal_token_manager::{program::CardinalTokenManager, state::TokenManager},
};

#[derive(Accounts)]
pub struct PayCtx<'info> {
    #[account(constraint = transfer_authority.key() == token_manager.transfer_authority.expect("No transfer authority found") @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    // #[account(mut, constraint = payment_token_account.mint == transfer_authority.payment_mint @ ErrorCode::InvalidPaymentTokenAccount)]
    // payment_token_account: Box<Account<'info, TokenAccount>>,

    // #[account(mut, constraint = fee_collector_token_account.mint == claim_approver.payment_mint @ ErrorCode::InvalidPaymentMint)]
    // fee_collector_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    // #[account(mut, constraint = payment_manager.key() == claim_approver.payment_manager @ ErrorCode::InvalidPaymentManager)]
    // payment_manager: UncheckedAccount<'info>,

    #[account(mut)]
    transfer_authority: Box<Account<'info, TranssferAuthority>>,

    #[account(mut)]
    payer: Signer<'info>,
    // #[account(mut, constraint =
    //     payer_token_account.owner == payer.key()
    //     && payer_token_account.mint == claim_approver.payment_mint
    //     @ ErrorCode::InvalidPayerTokenAccount
    // )]
    // payer_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    transfer_receipt: UncheckedAccount<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    // cardinal_payment_manager: Program<'info, CardinalPaymentManager>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, PayCtx<'info>>) -> Result<()> {
    // let remaining_accs = &mut ctx.remaining_accounts.iter();
    // assert_payment_token_account(&ctx.accounts.payment_token_account, &ctx.accounts.token_manager, remaining_accs)?;

    let token_manager = &mut ctx.accounts.token_manager;
    let transfer_authority = &mut ctx.accounts.transfer_authority;

    // if ctx.accounts.payment_manager.owner.key() == ctx.accounts.cardinal_payment_manager.key() {
    //     let payment_mint_info = next_account_info(remaining_accs)?;
    //     let payment_mint = Account::<Mint>::try_from(payment_mint_info)?;
    //     if claim_approver.payment_mint != payment_mint.key() {
    //         return Err(error!(ErrorCode::InvalidPaymentMint));
    //     }

    //     let mint_info = next_account_info(remaining_accs)?;
    //     let mint = Account::<Mint>::try_from(mint_info)?;
    //     if token_manager.mint != mint.key() {
    //         return Err(error!(ErrorCode::InvalidMint));
    //     }
    //     let mint_metadata_info = next_account_info(remaining_accs)?;

    //     let cpi_accounts = cardinal_payment_manager::cpi::accounts::HandlePaymentWithRoyaltiesCtx {
    //         payment_manager: ctx.accounts.payment_manager.to_account_info(),
    //         payer_token_account: ctx.accounts.payer_token_account.to_account_info(),
    //         fee_collector_token_account: ctx.accounts.fee_collector_token_account.to_account_info(),
    //         payment_token_account: ctx.accounts.payment_token_account.to_account_info(),
    //         payment_mint: payment_mint.to_account_info(),
    //         mint: mint.to_account_info(),
    //         mint_metadata: mint_metadata_info.to_account_info(),
    //         payer: ctx.accounts.payer.to_account_info(),
    //         token_program: ctx.accounts.token_program.to_account_info(),
    //     };
    //     let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_payment_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
    //     cardinal_payment_manager::cpi::handle_payment_with_royalties(cpi_ctx, claim_approver.payment_amount)?;
    // } else {
    //     let cpi_accounts = Transfer {
    //         from: ctx.accounts.payer_token_account.to_account_info(),
    //         to: ctx.accounts.payment_token_account.to_account_info(),
    //         authority: ctx.accounts.payer.to_account_info(),
    //     };
    //     let cpi_program = ctx.accounts.token_program.to_account_info();
    //     let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    //     token::transfer(cpi_context, ctx.accounts.claim_approver.payment_amount)?;
    // }

    let token_manager_key = ctx.accounts.token_manager.key();
    let transfer_authority_seeds = &[TRANSFER_AUTHORITY_SEED.as_bytes(), token_manager_key.as_ref(), &[ctx.accounts.transfer_authority.bump]];
    let tranfer_authority_signer = &[&transfer_authority_seeds[..]];

    // approve
    let cpi_accounts = cardinal_token_manager::cpi::accounts::CreateTransferReceiptCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        transfer_authority: ctx.accounts.transfer_authority.to_account_info(),
        transfer_receipt: ctx.accounts.transfer_receipt.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(tranfer_authority_signer);
    cardinal_token_manager::cpi::create_transfer_receipt(cpi_ctx, ctx.accounts.payer.key())?;
    Ok(())
}