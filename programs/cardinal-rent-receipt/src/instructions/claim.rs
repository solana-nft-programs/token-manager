use {
    crate::{state::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{program::CardinalTokenManager, state::{TokenManagerKind, TokenManager, InvalidationType}, instructions::IssueIx},
    anchor_spl::{token::{Token}}
};

#[derive(Accounts)]
#[instruction(bump: u8, _receipt_token_manager_bump: u8)]
pub struct ClaimCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init,
        payer = payer,
        space = RENT_RECEIPT_SIZE,
        seeds = [RENT_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref()], bump = bump,
    )]
    rent_receipt: Box<Account<'info, RentReceipt>>,

    #[account(mut)]
    rent_receipt_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    receipt_token_manager: UncheckedAccount<'info>,
    #[account(mut)]
    receipt_token_manager_token_account: UncheckedAccount<'info>,
    mint: UncheckedAccount<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,

    #[account(mut)]
    recipient: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimCtx>, bump: u8, receipt_token_manager_bump: u8) -> ProgramResult {
    let token_manager_key = ctx.accounts.token_manager.key();
    let rent_receipt_seeds = &[RENT_RECEIPT_SEED.as_bytes(), token_manager_key.as_ref(), &[bump]];
    let rent_receipt_signer = &[&rent_receipt_seeds[..]];

    let cpi_accounts = cardinal_token_manager::cpi::accounts::InitCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        issuer: ctx.accounts.rent_receipt.to_account_info(),
        issuer_token_account: ctx.accounts.rent_receipt_token_account.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let init_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(rent_receipt_signer);
    cardinal_token_manager::cpi::init(init_ctx, receipt_token_manager_bump, ctx.accounts.mint.key(), 1)?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::AddInvalidatorCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        issuer: ctx.accounts.rent_receipt.to_account_info(),
    };
    let add_invalidator_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(rent_receipt_signer);
    cardinal_token_manager::cpi::add_invalidator(add_invalidator_ctx, ctx.accounts.rent_receipt.key())?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::IssueCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        issuer: ctx.accounts.rent_receipt.to_account_info(),
        issuer_token_account: ctx.accounts.rent_receipt_token_account.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let issue_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(rent_receipt_signer);
    cardinal_token_manager::cpi::issue(issue_ctx, IssueIx{amount: 1, kind: TokenManagerKind::Managed as u8, invalidation_type: InvalidationType::Return as u8 })?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::ClaimCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        recipient: ctx.accounts.recipient.to_account_info(),
        recipient_token_account: ctx.accounts.rent_receipt_token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let claim_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(rent_receipt_signer);
    cardinal_token_manager::cpi::claim(claim_ctx)?;
    return Ok(())
}