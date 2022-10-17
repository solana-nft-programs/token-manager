use anchor_lang::AccountsClose;
use anchor_spl::{
    associated_token::{self, AssociatedToken},
    token::{Mint, Token, TokenAccount},
};

use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::{
        program::CardinalTokenManager,
        state::{TokenManager, TokenManagerState},
    },
};

use solana_program::sysvar::{
    self,
    instructions::{get_instruction_relative, load_current_index_checked},
};
use spl_associated_token_account::get_associated_token_address;

#[derive(Accounts)]
pub struct AcceptTransferCtx<'info> {
    #[account(mut, close = holder, constraint = transfer.token_manager == token_manager.key() @ ErrorCode::InvalidTransfer)]
    transfer: Box<Account<'info, Transfer>>,
    transfer_authority: Box<Account<'info, TransferAuthority>>,
    /// CHECK: This is not dangerous because this is just the pubkey that collects the closing account lamports
    #[account(mut)]
    transfer_receipt: UncheckedAccount<'info>,
    /// CHECK: This is not dangerous because this is the receipt getting initialized
    #[account(mut)]
    listing: UncheckedAccount<'info>,

    #[account(mut, constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,

    /// CHECK: This is not dangerous because the account is checked in the instruction handler
    #[account(mut)]
    recipient_token_account: UncheckedAccount<'info>,
    #[account(mut, constraint = recipient.key() == transfer.to @ ErrorCode::InvalidRecipient)]
    recipient: Signer<'info>,
    #[account(mut)]
    payer: Signer<'info>,

    #[account(mut, constraint = holder_token_account.owner == holder.key() && holder_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidHolderMintTokenAccount)]
    holder_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is not dangerous because this is just the pubkey that collects the closing account lamports
    #[account(mut, constraint = holder.key() == transfer.from @ ErrorCode::InvalidHolder)]
    holder: UncheckedAccount<'info>,
    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    associated_token_program: Program<'info, AssociatedToken>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
    rent: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because the ID is checked with instructions sysvar
    #[account(address = sysvar::instructions::id())]
    instructions: UncheckedAccount<'info>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, AcceptTransferCtx<'info>>) -> Result<()> {
    let instructions_account_info = ctx.accounts.instructions.to_account_info();
    let current_ix = load_current_index_checked(&instructions_account_info).expect("Error computing current index");
    if current_ix != 0_u16 {
        return Err(error!(ErrorCode::InstructionsDisallowed));
    }
    let next_ix = get_instruction_relative(1, &instructions_account_info);
    if next_ix.is_ok() {
        return Err(error!(ErrorCode::InstructionsDisallowed));
    }

    // Check ATA
    let associated_token_account = get_associated_token_address(&ctx.accounts.recipient.key(), &ctx.accounts.mint.key());
    if associated_token_account != ctx.accounts.recipient_token_account.key() {
        return Err(error!(ErrorCode::InvalidRecipientMintTokenAccount));
    }
    if ctx.accounts.recipient_token_account.data_is_empty() {
        let cpi_accounts = associated_token::Create {
            payer: ctx.accounts.payer.to_account_info(),
            associated_token: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.recipient.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            rent: ctx.accounts.rent.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        associated_token::create(cpi_context)?;
    }

    let remaining_accs = &mut ctx.remaining_accounts.iter();
    let transfer_authority_seeds = &[
        TRANSFER_AUTHORITY_SEED.as_bytes(),
        ctx.accounts.transfer_authority.name.as_bytes(),
        &[ctx.accounts.transfer_authority.bump],
    ];
    let transfer_authority_signer = &[&transfer_authority_seeds[..]];

    if ctx.accounts.token_manager.transfer_authority.is_none() || ctx.accounts.token_manager.transfer_authority.unwrap() != ctx.accounts.transfer_authority.key() {
        return Err(error!(ErrorCode::InvalidTransferAuthority));
    }

    // approve
    let cpi_accounts = cardinal_token_manager::cpi::accounts::CreateTransferReceiptCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        transfer_authority: ctx.accounts.transfer_authority.to_account_info(),
        transfer_receipt: ctx.accounts.transfer_receipt.to_account_info(),
        payer: ctx.accounts.recipient.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_signer(transfer_authority_signer);
    cardinal_token_manager::cpi::create_transfer_receipt(cpi_ctx, ctx.accounts.recipient.key())?;

    let cpi_accounts = cardinal_token_manager::cpi::accounts::TransferCtx {
        token_manager: ctx.accounts.token_manager.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        current_holder_token_account: ctx.accounts.holder_token_account.to_account_info(),
        recipient: ctx.accounts.recipient.to_account_info(),
        recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
        token_program: ctx.accounts.token_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts).with_remaining_accounts(remaining_accs.cloned().collect::<Vec<AccountInfo<'info>>>());
    cardinal_token_manager::cpi::transfer(cpi_ctx)?;

    // close listing if it exists
    assert_derivation(
        ctx.program_id,
        &ctx.accounts.listing.to_account_info(),
        &[LISTING_SEED.as_bytes(), ctx.accounts.token_manager.key().as_ref()],
    )?;
    let listing_info = Account::<Listing>::try_from(&ctx.accounts.listing);
    if listing_info.is_ok() {
        listing_info?.close(ctx.accounts.holder.to_account_info())?;
    }

    Ok(())
}
