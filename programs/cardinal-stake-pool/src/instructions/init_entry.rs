use {
    crate::{state::*},
    solana_program::{system_instruction::create_account, program_pack::Pack},
    anchor_lang::{prelude::*, solana_program::{program::{invoke, invoke_signed}}},
};

use cardinal_token_manager::{
    state::{TokenManager},
};

use anchor_spl::{
    token::{self, Mint, Token},
    associated_token::{self}
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct InitEntryIx {
    name: String,
    symbol: String,
    text_overlay: String
}

use metaplex_token_metadata::{instruction::{create_metadata_accounts}};

#[derive(Accounts)]
#[instruction(ix: InitEntryIx)]
pub struct InitEntryCtx<'info> {
    #[account(
        init,
        payer = payer,
        seeds = [STAKE_ENTRY_PREFIX.as_bytes(), stake_pool.identifier.as_ref(), original_mint.key().as_ref()],
        bump,
        space = STAKE_ENTRY_SIZE,
    )]
    stake_entry: Box<Account<'info, StakeEntry>>,
    stake_pool: Box<Account<'info, StakePool>>,
    token_manager: Box<Account<'info, TokenManager>>,

    original_mint: Box<Account<'info, Mint>>,
    #[account(constraint = token_manager.mint == mint.key())]
    mint: Signer<'info>,
    
    #[account(mut)]
    mint_token_account: UncheckedAccount<'info>,
    #[account(mut)]  
    mint_metadata: UncheckedAccount<'info>,

    #[account(mut)]
    payer: Signer<'info>,
    rent: Sysvar<'info, Rent>,
    token_program: Program<'info, Token>,
    token_metadata_program: UncheckedAccount<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<InitEntryCtx>, ix: InitEntryIx) -> Result<()> {
    let stake_entry = &mut ctx.accounts.stake_entry;
    stake_entry.bump = *ctx.bumps.get("stake_entry").unwrap();
    stake_entry.token_manager = ctx.accounts.token_manager.key();
    stake_entry.original_mint = ctx.accounts.original_mint.key();
    stake_entry.mint = ctx.accounts.mint.key();

    let stake_entry_seed = &[STAKE_ENTRY_PREFIX.as_bytes(), stake_entry.original_mint.as_ref(), &[stake_entry.bump]];
    let stake_entry_signer = &[&stake_entry_seed[..]];

    // create mint
    invoke(
        &create_account(
            ctx.accounts.payer.key,
            ctx.accounts.mint.key,
            ctx.accounts.rent.minimum_balance(spl_token::state::Mint::LEN),
            spl_token::state::Mint::LEN as u64,
            &spl_token::id(),
        ),
        &[
            ctx.accounts.payer.to_account_info(), 
            ctx.accounts.mint.to_account_info(),
        ],
    )?;

    // Initialize token manager mint
    let cpi_accounts = token::InitializeMint {
        mint: ctx.accounts.mint.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::initialize_mint(cpi_context, 0, &stake_entry.key(), Some(&stake_entry.key()))?;

    // create associated token account for stake_entry
    let cpi_accounts = associated_token::Create {
        payer: ctx.accounts.payer.to_account_info(),
        associated_token: ctx.accounts.mint_token_account.to_account_info(),
        authority: stake_entry.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    associated_token::create(cpi_context)?;

    // create metadata
    invoke_signed(
        &create_metadata_accounts(
            *ctx.accounts.token_metadata_program.key,
            *ctx.accounts.mint_metadata.key,
            *ctx.accounts.mint.key,
            stake_entry.key(),
            *ctx.accounts.payer.key,
            stake_entry.key(),
            ix.name,
            ix.symbol,
            // generative URL which will include image of the name with expiration data
            "https://api.cardinal.so/metadata/".to_string() + &ctx.accounts.mint.key().to_string() + &"?text=STAKING".to_string() + &ix.text_overlay,
            None,
            1,
            true,
            true,
        ),
        &[
            ctx.accounts.mint_metadata.to_account_info(), 
            ctx.accounts.mint.to_account_info(),
            stake_entry.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            stake_entry.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.rent.to_account_info(),
        ],
        stake_entry_signer,
    )?;
    
    // mint single token to token manager mint token account
    let cpi_accounts = token::MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.mint_token_account.to_account_info(),
        authority: stake_entry.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(stake_entry_signer);
    token::mint_to(cpi_context, 1)?;

    return Ok(())
}