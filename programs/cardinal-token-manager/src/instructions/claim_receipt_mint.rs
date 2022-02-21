use {
    crate::{state::*, errors::*},
    solana_program::{system_instruction::create_account, program_pack::Pack},
    anchor_lang::{prelude::*, solana_program::{program::{invoke_signed, invoke}}},
    anchor_spl::{token::{self, Token}, associated_token::{self, AssociatedToken}},
    mpl_token_metadata::{instruction::{create_metadata_accounts_v2}},
};

#[derive(Accounts)]
pub struct ClaimReceiptMint<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Issued as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,

    // issuer
    #[account(mut, constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,

    #[account(mut)]
    receipt_mint: Signer<'info>,
    #[account(mut)]
    receipt_mint_metadata: UncheckedAccount<'info>,
    #[account(mut)]
    recipient_token_account: UncheckedAccount<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    associated_token: Program<'info, AssociatedToken>,
    system_program: Program<'info, System>,
    #[account(address = mpl_token_metadata::id())]
    token_metadata_program: UncheckedAccount<'info>,
    rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<ClaimReceiptMint>, name: String) -> ProgramResult {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.receipt_mint = Some(ctx.accounts.receipt_mint.key());

    // get PDA seeds to sign with
    let mint = token_manager.mint;
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // allocate receipt mint
    invoke(
        &create_account(
            ctx.accounts.payer.key,
            ctx.accounts.receipt_mint.key,
            ctx.accounts.rent.minimum_balance(spl_token::state::Mint::LEN),
            spl_token::state::Mint::LEN as u64,
            &spl_token::id(),
        ),
        &[
            ctx.accounts.payer.to_account_info(), 
            ctx.accounts.receipt_mint.to_account_info(),
        ]
    )?;
    
    // initialize receipt mint
    let cpi_accounts = token::InitializeMint {
        mint: ctx.accounts.receipt_mint.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::initialize_mint(cpi_context, 0, &ctx.accounts.token_manager.key(), Some(&ctx.accounts.token_manager.key()))?;

    // create metadata
    invoke_signed(
        &create_metadata_accounts_v2(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.receipt_mint_metadata.key,
            *ctx.accounts.receipt_mint.key,
            ctx.accounts.token_manager.key(),
            *ctx.accounts.issuer.key,
            ctx.accounts.token_manager.key(),   
            name.to_string(),
            "RCP".to_string(),
            // generative URL pointing to the original mint
            "https://api.cardinal.so/metadata/".to_string() + &ctx.accounts.token_manager.mint.to_string(),
            None,
            0,
            true,
            true,
            None,
            None
        ),
        &[
            ctx.accounts.receipt_mint_metadata.to_account_info(), 
            ctx.accounts.receipt_mint.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
            ctx.accounts.issuer.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        token_manager_signer,
    )?;

    // create associated token account for recipient
    let cpi_accounts = associated_token::Create {
        payer: ctx.accounts.payer.to_account_info(),
        associated_token: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.issuer.to_account_info(),
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
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::mint_to(cpi_context, 1)?;
    return Ok(())
}