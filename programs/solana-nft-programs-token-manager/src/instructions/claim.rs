use mpl_token_metadata::accounts::Metadata;
use mpl_token_metadata::instructions::DelegateLockedTransferV1;
use mpl_token_metadata::instructions::DelegateLockedTransferV1InstructionArgs;
use mpl_token_metadata::instructions::LockV1;
use mpl_token_metadata::instructions::LockV1InstructionArgs;
use mpl_token_metadata::instructions::TransferV1;
use mpl_token_metadata::instructions::TransferV1InstructionArgs;
use mpl_token_metadata::types::TokenStandard;
use mpl_utils::assert_derivation;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::transfer;
use anchor_lang::AccountsClose;
use anchor_spl::token::Approve;
use anchor_spl::token::FreezeAccount;
use anchor_spl::token::Mint;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};

#[derive(Accounts)]
pub struct ClaimCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Issued as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint =
        token_manager_token_account.owner == token_manager.key()
        && token_manager_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidTokenManagerTokenAccount
    )]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,

    // recipient
    #[account(mut)]
    recipient: Signer<'info>,
    #[account(mut, constraint =
        recipient_token_account.owner == recipient.key()
        && recipient_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidRecipientTokenAccount
    )]
    recipient_token_account: Box<Account<'info, TokenAccount>>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ClaimCtx<'info>>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.recipient_token_account = ctx.accounts.recipient_token_account.key();
    token_manager.state = TokenManagerState::Claimed as u8;
    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    let remaining_accs = &mut ctx.remaining_accounts.iter().peekable();

    // get PDA seeds to sign with
    let mint = token_manager.mint;
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    if token_manager.kind != TokenManagerKind::Programmable as u8 {
        // look at next account
        if let Some(next_account) = remaining_accs.peek() {
            if next_account.owner == &mpl_token_metadata::ID {
                let mint_metadata_data = next_account.try_borrow_mut_data().expect("Failed to borrow data");
                if let Ok(metadata) = Metadata::deserialize(&mut mint_metadata_data.as_ref()) {
                    // migrated pnft
                    if metadata.token_standard == Some(TokenStandard::ProgrammableNonFungible) && metadata.mint == mint {
                        // pop this account and update type
                        next_account_info(remaining_accs)?;
                        token_manager.kind = TokenManagerKind::Programmable as u8;
                    }
                }
            }
        }
    }

    // if this is a managed token, this means we will revoke it at the end of life, so we need to delegate and freeze
    match token_manager.kind {
        k if k == TokenManagerKind::Unmanaged as u8 => {
            // transfer amount to recipient token account
            let cpi_accounts = Transfer {
                from: ctx.accounts.token_manager_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;
        }

        k if k == TokenManagerKind::Managed as u8 => {
            // transfer amount to recipient token account
            let cpi_accounts = Transfer {
                from: ctx.accounts.token_manager_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;

            // set account delegate of recipient token account to token manager PDA
            let cpi_accounts = Approve {
                to: ctx.accounts.recipient_token_account.to_account_info(),
                delegate: token_manager.to_account_info(),
                authority: ctx.accounts.recipient.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
            token::approve(cpi_context, token_manager.amount)?;

            let mint_manager_info = next_account_info(remaining_accs)?;
            let mint = ctx.accounts.mint.key();
            let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
            assert_derivation(ctx.program_id, mint_manager_info, path, error!(ErrorCode::PublicKeyMismatch))?;
            // update mint manager
            let mut mint_manager = Account::<MintManager>::try_from(mint_manager_info)?;
            mint_manager.token_managers = mint_manager.token_managers.checked_add(1).expect("Addition error");
            mint_manager.exit(ctx.program_id)?;
            let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[mint_manager.bump]];
            let mint_manager_signer = &[&mint_manager_seeds[..]];

            // freeze recipient token account
            let cpi_accounts = FreezeAccount {
                account: ctx.accounts.recipient_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: mint_manager_info.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
            token::freeze_account(cpi_context)?;
        }

        k if k == TokenManagerKind::Edition as u8 => {
            // transfer amount to recipient token account
            let cpi_accounts = Transfer {
                from: ctx.accounts.token_manager_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;

            let edition_info = next_account_info(remaining_accs)?;
            let metadata_program = next_account_info(remaining_accs)?;

            // edition will be validated by metadata_program
            // assert_keys_eq!(metadata_program.key, mpl_token_metadata::ID);
            if metadata_program.key() != mpl_token_metadata::ID {
                return Err(error!(ErrorCode::PublicKeyMismatch));
            }

            // set account delegate of recipient token account to token manager PDA
            let cpi_accounts = Approve {
                to: ctx.accounts.recipient_token_account.to_account_info(),
                delegate: token_manager.to_account_info(),
                authority: ctx.accounts.recipient.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
            token::approve(cpi_context, token_manager.amount)?;

            invoke_signed(
                &mpl_token_metadata::instructions::FreezeDelegatedAccount {
                    delegate: token_manager.key(),
                    token_account: ctx.accounts.recipient_token_account.key(),
                    edition: edition_info.key(),
                    mint: ctx.accounts.mint.key(),
                    token_program: ctx.accounts.token_program.key(),
                }
                .instruction(),
                &[
                    token_manager.to_account_info(),
                    ctx.accounts.recipient_token_account.to_account_info(),
                    edition_info.to_account_info(),
                    ctx.accounts.mint.to_account_info(),
                ],
                &[token_manager_seeds],
            )?;
        }

        k if k == TokenManagerKind::Permissioned as u8 => {
            // transfer amount to recipient token account
            let cpi_accounts = Transfer {
                from: ctx.accounts.token_manager_token_account.to_account_info(),
                to: ctx.accounts.recipient_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;

            let mint_manager_info = next_account_info(remaining_accs)?;
            let mint = ctx.accounts.mint.key();
            let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
            assert_derivation(ctx.program_id, mint_manager_info, path, error!(ErrorCode::PublicKeyMismatch))?;

            // update mint manager
            let mut mint_manager = Account::<MintManager>::try_from(mint_manager_info)?;
            mint_manager.token_managers = mint_manager.token_managers.checked_add(1).expect("Addition error");
            mint_manager.exit(ctx.program_id)?;
            let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[mint_manager.bump]];
            let mint_manager_signer = &[&mint_manager_seeds[..]];

            // freeze recipient token account
            let cpi_accounts = FreezeAccount {
                account: ctx.accounts.recipient_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: mint_manager_info.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
            token::freeze_account(cpi_context)?;
        }

        k if k == TokenManagerKind::Programmable as u8 => {
            // transfer
            let mint_info = next_account_info(remaining_accs)?;
            let mint_metadata_info = next_account_info(remaining_accs)?;
            let mint_edition_info = next_account_info(remaining_accs)?;
            let token_manager_token_record_info = next_account_info(remaining_accs)?;
            let recipient_token_record_info = next_account_info(remaining_accs)?;
            let sysvar_instructions_info = next_account_info(remaining_accs)?;
            let associated_token_program_info = next_account_info(remaining_accs)?;
            let authorization_rules_program_info = next_account_info(remaining_accs)?;
            let authorization_rules_info = next_account_info(remaining_accs)?;
            let _token_metadata_program = next_account_info(remaining_accs)?;

            invoke_signed(
                &TransferV1 {
                    token: ctx.accounts.token_manager_token_account.key(),
                    token_owner: ctx.accounts.token_manager_token_account.owner.key(),
                    destination_token: ctx.accounts.recipient_token_account.key(),
                    destination_owner: ctx.accounts.recipient.key(),
                    mint: mint_info.key(),
                    metadata: mint_metadata_info.key(),
                    edition: Some(mint_edition_info.key()),
                    token_record: Some(token_manager_token_record_info.key()),
                    destination_token_record: Some(recipient_token_record_info.key()),
                    authority: token_manager.key(),
                    payer: ctx.accounts.recipient.key(),
                    system_program: ctx.accounts.system_program.key(),
                    sysvar_instructions: sysvar_instructions_info.key(),
                    spl_token_program: ctx.accounts.token_program.key(),
                    spl_ata_program: associated_token_program_info.key(),
                    authorization_rules_program: Some(authorization_rules_program_info.key()),
                    authorization_rules: Some(authorization_rules_info.key()),
                }
                .instruction(TransferV1InstructionArgs {
                    amount: token_manager.amount,
                    authorization_data: None,
                }),
                &[
                    ctx.accounts.token_manager_token_account.to_account_info(),
                    token_manager.to_account_info(),
                    ctx.accounts.recipient_token_account.to_account_info(),
                    ctx.accounts.recipient.to_account_info(),
                    mint_info.to_account_info(),
                    mint_metadata_info.to_account_info(),
                    mint_edition_info.to_account_info(),
                    token_manager_token_record_info.to_account_info(),
                    recipient_token_record_info.to_account_info(),
                    token_manager.to_account_info(),
                    ctx.accounts.recipient.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    sysvar_instructions_info.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    associated_token_program_info.to_account_info(),
                    authorization_rules_program_info.to_account_info(),
                    authorization_rules_info.to_account_info(),
                ],
                token_manager_signer,
            )?;

            invoke(
                &DelegateLockedTransferV1 {
                    delegate_record: Some(mpl_token_metadata::ID),
                    delegate: ctx.accounts.token_manager.key(),
                    metadata: mint_metadata_info.key(),
                    master_edition: Some(mint_edition_info.key()),
                    token_record: Some(recipient_token_record_info.key()),
                    mint: mint_info.key(),
                    token: ctx.accounts.recipient_token_account.key(),
                    authority: ctx.accounts.recipient.key(),
                    payer: ctx.accounts.recipient.key(),
                    system_program: ctx.accounts.system_program.key(),
                    sysvar_instructions: sysvar_instructions_info.key(),
                    spl_token_program: Some(ctx.accounts.token_program.key()),
                    authorization_rules_program: Some(authorization_rules_program_info.key()),
                    authorization_rules: Some(authorization_rules_info.key()),
                }
                .instruction(DelegateLockedTransferV1InstructionArgs {
                    amount: 1,
                    locked_address: token_manager.key(),
                    authorization_data: None,
                }),
                &[
                    token_manager.to_account_info(),
                    mint_metadata_info.to_account_info(),
                    mint_edition_info.to_account_info(),
                    recipient_token_record_info.to_account_info(),
                    mint_info.to_account_info(),
                    ctx.accounts.recipient_token_account.to_account_info(),
                    ctx.accounts.recipient.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    sysvar_instructions_info.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    authorization_rules_program_info.to_account_info(),
                    authorization_rules_info.to_account_info(),
                ],
            )?;

            invoke_signed(
                &LockV1 {
                    authority: ctx.accounts.token_manager.key(),
                    token_owner: Some(ctx.accounts.recipient.key()),
                    token: ctx.accounts.recipient_token_account.key(),
                    mint: mint_info.key(),
                    metadata: mint_metadata_info.key(),
                    edition: Some(mint_edition_info.key()),
                    token_record: Some(recipient_token_record_info.key()),
                    payer: ctx.accounts.recipient.key(),
                    system_program: ctx.accounts.system_program.key(),
                    sysvar_instructions: sysvar_instructions_info.key(),
                    spl_token_program: Some(ctx.accounts.token_program.key()),
                    authorization_rules_program: Some(authorization_rules_program_info.key()),
                    authorization_rules: Some(authorization_rules_info.key()),
                }
                .instruction(LockV1InstructionArgs { authorization_data: None }),
                &[
                    token_manager.to_account_info(),
                    ctx.accounts.recipient.to_account_info(),
                    ctx.accounts.recipient_token_account.to_account_info(),
                    mint_info.to_account_info(),
                    ctx.accounts.recipient_token_account.to_account_info(),
                    mint_info.to_account_info(),
                    mint_metadata_info.to_account_info(),
                    mint_edition_info.to_account_info(),
                    recipient_token_record_info.to_account_info(),
                    ctx.accounts.recipient.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    sysvar_instructions_info.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    authorization_rules_program_info.to_account_info(),
                    authorization_rules_info.to_account_info(),
                ],
                token_manager_signer,
            )?;
        }
        _ => return Err(error!(ErrorCode::InvalidTokenManagerKind)),
    }

    if token_manager.invalidation_type == InvalidationType::Reissue as u8 || token_manager.invalidation_type == InvalidationType::Invalidate as u8 {
        invoke(
            &transfer(&ctx.accounts.recipient.key(), &token_manager.key(), INVALIDATION_REWARD_LAMPORTS),
            &[ctx.accounts.recipient.to_account_info(), token_manager.to_account_info(), ctx.accounts.system_program.to_account_info()],
        )?;
    }

    // verify claim receipt
    if token_manager.claim_approver.is_some() {
        let claim_receipt_info = next_account_info(remaining_accs)?;
        let claim_receipt = Account::<ClaimReceipt>::try_from(claim_receipt_info)?;
        if claim_receipt.mint_count != token_manager.count {
            return Err(error!(ErrorCode::InvalidClaimReceipt));
        }
        if claim_receipt.token_manager != token_manager.key() {
            return Err(error!(ErrorCode::InvalidClaimReceipt));
        }
        if claim_receipt.target != ctx.accounts.recipient.key() {
            return Err(error!(ErrorCode::InvalidClaimReceipt));
        }
        claim_receipt.close(token_manager.to_account_info())?;
    }
    Ok(())
}
