use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*, solana_program::{program::{invoke_signed}}},
    cardinal_token_manager::{program::CardinalTokenManager, state::{TokenManagerKind, TokenManager, InvalidationType}, instructions::IssueIx},
    anchor_spl::{token::{self, Token}, associated_token::{self}},
    mpl_token_metadata::{instruction::{create_metadata_accounts}},
};

#[derive(Accounts)]
pub struct ClaimCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(
        init,
        payer = payer,
        space = RECEIPT_MARKER_SIZE,
        seeds = [RECEIPT_MARKER_SEED.as_bytes(), token_manager.key().as_ref()], bump,
    )]
    receipt_marker: Box<Account<'info, ReceiptMarker>>,

    #[account(mut)]
    receipt_marker_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    receipt_token_manager: UncheckedAccount<'info>,
    #[account(mut)]
    receipt_token_manager_token_account: UncheckedAccount<'info>,
    #[account(mut)]
    receipt_mint_metadata: UncheckedAccount<'info>,
    receipt_mint: UncheckedAccount<'info>,

    cardinal_token_manager: Program<'info, CardinalTokenManager>,

    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    #[account(address = mpl_token_metadata::id())]
    token_metadata_program: UncheckedAccount<'info>,
    rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<ClaimCtx>, name: String) -> ProgramResult {
    let token_manager_key = ctx.accounts.token_manager.key();
    let receipt_marker_bump = *ctx.bumps.get("receipt_marker").unwrap();
    let receipt_marker_seeds = &[RECEIPT_MARKER_SEED.as_bytes(), token_manager_key.as_ref(), &[receipt_marker_bump]];
    let receipt_marker_signer = &[&receipt_marker_seeds[..]];

    let receipt_marker = &mut ctx.accounts.receipt_marker;
    receipt_marker.bump = receipt_marker_bump;
    receipt_marker.receipt_manager = ctx.accounts.receipt_token_manager.key();

    // initialize receipt mint
    let cpi_accounts = token::InitializeMint {
        mint: ctx.accounts.receipt_mint.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::initialize_mint(cpi_context, 0, &ctx.accounts.receipt_marker.key(), Some(&ctx.accounts.receipt_marker.key()))?;

    // create metadata
    invoke_signed(
        &create_metadata_accounts(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.receipt_mint_metadata.key,
            *ctx.accounts.receipt_mint.key,
            ctx.accounts.receipt_marker.key(),
            *ctx.accounts.issuer.key,
            ctx.accounts.receipt_marker.key(),   
            name.to_string(),
            "RCP".to_string(),
            // generative URL pointing to the original mint
            "https://api.cardinal.so/metadata/".to_string() + &ctx.accounts.token_manager.mint.to_string(),
            None,
            0,
            true,
            true,
        ),
        &[
            ctx.accounts.receipt_mint_metadata.to_account_info(), 
            ctx.accounts.receipt_mint.to_account_info(),
            ctx.accounts.receipt_marker.to_account_info(),
            ctx.accounts.issuer.to_account_info(),
            ctx.accounts.receipt_marker.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        receipt_marker_signer,
    )?;

    // create associated token account for receipt
    let cpi_accounts = associated_token::Create {
        payer: ctx.accounts.payer.to_account_info(),
        associated_token: ctx.accounts.receipt_marker_token_account.to_account_info(),
        authority: ctx.accounts.receipt_marker.to_account_info(),
        mint: ctx.accounts.receipt_mint.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    associated_token::create(cpi_context)?;
            
    // mint single token to receipt_marker token account
    let cpi_accounts = token::MintTo {
        mint: ctx.accounts.receipt_mint.to_account_info(),
        to: ctx.accounts.receipt_marker_token_account.to_account_info(),
        authority: ctx.accounts.receipt_marker.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(receipt_marker_signer);
    token::mint_to(cpi_context, 1)?;

    // create associated token account for token_manager
    let cpi_accounts = associated_token::Create {
        payer: ctx.accounts.payer.to_account_info(),
        associated_token: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        authority: ctx.accounts.receipt_marker.to_account_info(),
        mint: ctx.accounts.receipt_mint.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    associated_token::create(cpi_context)?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::InitCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        issuer: ctx.accounts.receipt_marker.to_account_info(),
        issuer_token_account: ctx.accounts.receipt_marker_token_account.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let init_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(receipt_marker_signer);
    cardinal_token_manager::cpi::init(init_ctx, ctx.accounts.receipt_mint.key(), 1)?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::AddInvalidatorCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        issuer: ctx.accounts.receipt_marker.to_account_info(),
    };
    let add_invalidator_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(receipt_marker_signer);
    cardinal_token_manager::cpi::add_invalidator(add_invalidator_ctx, ctx.accounts.receipt_marker.key())?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::IssueCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        issuer: ctx.accounts.receipt_marker.to_account_info(),
        issuer_token_account: ctx.accounts.receipt_marker_token_account.to_account_info(),
        payer: ctx.accounts.payer.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let issue_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(receipt_marker_signer);
    cardinal_token_manager::cpi::issue(issue_ctx, IssueIx{amount: 1, kind: TokenManagerKind::Managed as u8, invalidation_type: InvalidationType::Return as u8 })?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::ClaimCtx {
        token_manager: ctx.accounts.receipt_token_manager.to_account_info(),
        token_manager_token_account: ctx.accounts.receipt_token_manager_token_account.to_account_info(),
        recipient: ctx.accounts.issuer.to_account_info(),
        recipient_token_account: ctx.accounts.receipt_marker_token_account.to_account_info(),
        mint: ctx.accounts.receipt_mint.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let claim_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(receipt_marker_signer);
    cardinal_token_manager::cpi::claim(claim_ctx)?;
    return Ok(())
}