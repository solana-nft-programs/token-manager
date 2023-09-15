use mpl_token_metadata::accounts::Metadata;
use mpl_token_metadata::instructions::TransferV1;
use mpl_token_metadata::instructions::TransferV1InstructionArgs;
use mpl_token_metadata::instructions::UnlockV1;
use mpl_token_metadata::instructions::UnlockV1InstructionArgs;
use mpl_token_metadata::types::TokenStandard;
use mpl_utils::assert_derivation;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::AccountsClose;
use anchor_spl::token::CloseAccount;
use anchor_spl::token::Mint;
use anchor_spl::token::ThawAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint =
        token_manager_token_account.owner == token_manager.key()
        && token_manager_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidTokenManagerTokenAccount
    )]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,

    // recipient
    #[account(mut, constraint = recipient_token_account.key() == token_manager.recipient_token_account @ ErrorCode::InvalidRecipientTokenAccount)]
    recipient_token_account: Box<Account<'info, TokenAccount>>,

    // invalidator
    #[account(constraint =
        token_manager.invalidators.contains(&invalidator.key())
        || ((token_manager.invalidation_type == InvalidationType::Return as u8
            || token_manager.invalidation_type == InvalidationType::Reissue as u8)
        && recipient_token_account.owner == invalidator.key())
        @ ErrorCode::InvalidInvalidator
    )]
    invalidator: Signer<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    collector: AccountInfo<'info>,
    token_program: Program<'info, Token>,
    rent: Sysvar<'info, Rent>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
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

    if token_manager.state == TokenManagerState::Claimed as u8 {
        match token_manager.kind {
            k if k == TokenManagerKind::Unmanaged as u8 => {}
            k if k == TokenManagerKind::Managed as u8 || k == TokenManagerKind::Permissioned as u8 => {
                let mint_manager_info = next_account_info(remaining_accs)?;
                // update mint manager
                let mut mint_manager = Account::<MintManager>::try_from(mint_manager_info)?;
                mint_manager.token_managers = mint_manager.token_managers.checked_sub(1).expect("Sub error");
                mint_manager.exit(ctx.program_id)?;

                let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
                let bump_seed = assert_derivation(ctx.program_id, mint_manager_info, path, error!(ErrorCode::PublicKeyMismatch))?;
                let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[bump_seed]];
                let mint_manager_signer = &[&mint_manager_seeds[..]];

                // thaw recipient account
                let cpi_accounts = ThawAccount {
                    account: ctx.accounts.recipient_token_account.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    authority: mint_manager_info.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
                token::thaw_account(cpi_context)?;
            }
            k if k == TokenManagerKind::Edition as u8 => {
                let edition_info = next_account_info(remaining_accs)?;
                let metadata_program = next_account_info(remaining_accs)?;
                // edition will be validated by metadata_program
                if metadata_program.key() != mpl_token_metadata::ID {
                    return Err(error!(ErrorCode::InvalidMetadataProgramId));
                }

                invoke_signed(
                    &mpl_token_metadata::instructions::ThawDelegatedAccount {
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
            k if k == TokenManagerKind::Programmable as u8 => {}
            _ => return Err(error!(ErrorCode::InvalidTokenManagerKind)),
        }
    }

    match token_manager.invalidation_type {
        t if t == InvalidationType::Vest as u8 => {
            if token_manager.state == TokenManagerState::Issued as u8 {
                // find claim_approver token account
                let claim_approver_token_account_info = next_account_info(remaining_accs)?;
                let claim_approver_token_account = Account::<TokenAccount>::try_from(claim_approver_token_account_info)?;
                if claim_approver_token_account.owner != token_manager.claim_approver.expect("No claim approver found") {
                    return Err(error!(ErrorCode::InvalidReceiptMintOwner));
                }

                // transfer to claim_approver
                let cpi_accounts = Transfer {
                    from: ctx.accounts.token_manager_token_account.to_account_info(),
                    to: claim_approver_token_account.to_account_info(),
                    authority: token_manager.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                token::transfer(cpi_context, token_manager.amount)?;
            } else {
                // transfer to token_manager to clear the delegate
                let cpi_accounts = Transfer {
                    from: ctx.accounts.recipient_token_account.to_account_info(),
                    to: ctx.accounts.token_manager_token_account.to_account_info(),
                    authority: token_manager.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                token::transfer(cpi_context, token_manager.amount)?;

                // transfer back to receipient unlocked
                let cpi_accounts = Transfer {
                    from: ctx.accounts.token_manager_token_account.to_account_info(),
                    to: ctx.accounts.recipient_token_account.to_account_info(),
                    authority: token_manager.to_account_info(),
                };
                let cpi_program = ctx.accounts.token_program.to_account_info();
                let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                token::transfer(cpi_context, token_manager.amount)?;
            }

            // close token_manager_token_account
            let cpi_accounts = CloseAccount {
                account: ctx.accounts.token_manager_token_account.to_account_info(),
                destination: ctx.accounts.collector.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::close_account(cpi_context)?;

            // close token_manager
            token_manager.state = TokenManagerState::Invalidated as u8;
            token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
            token_manager.close(ctx.accounts.collector.to_account_info())?;
        }
        t if t == InvalidationType::Return as u8 || token_manager.state == TokenManagerState::Issued as u8 => {
            match token_manager.kind {
                k if k == TokenManagerKind::Programmable as u8 => {
                    // find receipt holder
                    let return_token_account_info = next_account_info(remaining_accs)?;
                    let return_token_account = Account::<TokenAccount>::try_from(return_token_account_info)?;
                    let return_token_account_owner_info = next_account_info(remaining_accs)?;
                    if return_token_account.owner != return_token_account_owner_info.key() {
                        return Err(error!(ErrorCode::InvalidReturnTarget));
                    }

                    if token_manager.receipt_mint.is_none() {
                        if return_token_account.owner != token_manager.issuer {
                            return Err(error!(ErrorCode::InvalidIssuerTokenAccount));
                        }
                    } else {
                        let receipt_token_account_info = next_account_info(remaining_accs)?;
                        let receipt_token_account = Account::<TokenAccount>::try_from(receipt_token_account_info)?;
                        if !(receipt_token_account.mint == token_manager.receipt_mint.expect("No receipt mint") && receipt_token_account.amount > 0) {
                            return Err(error!(ErrorCode::InvalidReceiptMintAccount));
                        }
                        if receipt_token_account.owner != return_token_account.owner {
                            return Err(error!(ErrorCode::InvalidReceiptMintOwner));
                        }
                    }

                    let recipient_token_account_owner_info = next_account_info(remaining_accs)?;
                    let payer_info = next_account_info(remaining_accs)?;
                    let system_program_info = next_account_info(remaining_accs)?;
                    let token_manager_token_record = next_account_info(remaining_accs)?;
                    let mint_info = next_account_info(remaining_accs)?;
                    let mint_metadata_info = next_account_info(remaining_accs)?;
                    let mint_edition_info = next_account_info(remaining_accs)?;
                    let from_token_record = next_account_info(remaining_accs)?;
                    let to_token_record = next_account_info(remaining_accs)?;
                    let sysvar_instructions_info = next_account_info(remaining_accs)?;
                    let associated_token_program_info = next_account_info(remaining_accs)?;
                    let authorization_rules_program_info = next_account_info(remaining_accs)?;
                    let authorization_rules_info = next_account_info(remaining_accs)?;

                    invoke_signed(
                        &UnlockV1 {
                            authority: token_manager.key(),
                            token_owner: Some(recipient_token_account_owner_info.key()),
                            token: ctx.accounts.recipient_token_account.owner,
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(from_token_record.key()),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
                            sysvar_instructions: sysvar_instructions_info.key(),
                            spl_token_program: Some(ctx.accounts.token_program.key()),
                            authorization_rules_program: Some(authorization_rules_program_info.key()),
                            authorization_rules: Some(authorization_rules_info.key()),
                        }
                        .instruction(UnlockV1InstructionArgs { authorization_data: None }),
                        &[
                            token_manager.to_account_info(),
                            recipient_token_account_owner_info.to_account_info(),
                            ctx.accounts.recipient_token_account.to_account_info(),
                            mint_info.to_account_info(),
                            ctx.accounts.recipient_token_account.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            from_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;

                    invoke_signed(
                        &TransferV1 {
                            token: ctx.accounts.recipient_token_account.key(),
                            token_owner: recipient_token_account_owner_info.key(),
                            destination_token: ctx.accounts.token_manager_token_account.key(),
                            destination_owner: token_manager.key(),
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(from_token_record.key()),
                            destination_token_record: Some(token_manager_token_record.key()),
                            authority: token_manager.key(),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
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
                            ctx.accounts.recipient_token_account.to_account_info(),
                            recipient_token_account_owner_info.to_account_info(),
                            ctx.accounts.token_manager_token_account.to_account_info(),
                            token_manager.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            from_token_record.to_account_info(),
                            token_manager_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            associated_token_program_info.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;

                    invoke_signed(
                        &TransferV1 {
                            token: ctx.accounts.token_manager_token_account.key(),
                            token_owner: token_manager.key(),
                            destination_token: return_token_account_info.key(),
                            destination_owner: return_token_account_owner_info.key(),
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(token_manager_token_record.key()),
                            destination_token_record: Some(to_token_record.key()),
                            authority: token_manager.key(),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
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
                            return_token_account_info.to_account_info(),
                            return_token_account_owner_info.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            token_manager_token_record.to_account_info(),
                            to_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            associated_token_program_info.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;

                    // close token_manager_token_account
                    let cpi_accounts = CloseAccount {
                        account: ctx.accounts.token_manager_token_account.to_account_info(),
                        destination: ctx.accounts.collector.to_account_info(),
                        authority: token_manager.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    token::close_account(cpi_context)?;

                    // close token_manager
                    token_manager.state = TokenManagerState::Invalidated as u8;
                    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
                    token_manager.close(ctx.accounts.collector.to_account_info())?;
                }
                _ => {
                    // find receipt holder
                    let return_token_account_info = next_account_info(remaining_accs)?;
                    let return_token_account = Account::<TokenAccount>::try_from(return_token_account_info)?;
                    if token_manager.receipt_mint.is_none() {
                        if return_token_account.owner != token_manager.issuer {
                            return Err(error!(ErrorCode::InvalidIssuerTokenAccount));
                        }
                    } else {
                        let receipt_token_account_info = next_account_info(remaining_accs)?;
                        let receipt_token_account = Account::<TokenAccount>::try_from(receipt_token_account_info)?;
                        if !(receipt_token_account.mint == token_manager.receipt_mint.expect("No receipt mint") && receipt_token_account.amount > 0) {
                            return Err(error!(ErrorCode::InvalidReceiptMintAccount));
                        }
                        if receipt_token_account.owner != return_token_account.owner {
                            return Err(error!(ErrorCode::InvalidReceiptMintOwner));
                        }
                    }

                    // transfer back to issuer or receipt holder
                    let cpi_accounts = Transfer {
                        from: ctx.accounts.recipient_token_account.to_account_info(),
                        to: return_token_account_info.to_account_info(),
                        authority: token_manager.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    token::transfer(cpi_context, token_manager.amount)?;

                    // close token_manager_token_account
                    let cpi_accounts = CloseAccount {
                        account: ctx.accounts.token_manager_token_account.to_account_info(),
                        destination: ctx.accounts.collector.to_account_info(),
                        authority: token_manager.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    token::close_account(cpi_context)?;

                    // close token_manager
                    token_manager.state = TokenManagerState::Invalidated as u8;
                    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
                    token_manager.close(ctx.accounts.collector.to_account_info())?;
                }
            }
        }
        t if t == InvalidationType::Invalidate as u8 => {
            // close token_manager_token_account
            let cpi_accounts = CloseAccount {
                account: ctx.accounts.token_manager_token_account.to_account_info(),
                destination: ctx.accounts.collector.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::close_account(cpi_context)?;

            // mark invalid
            token_manager.state = TokenManagerState::Invalidated as u8;
            token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;

            let required_lamports = ctx.accounts.rent.minimum_balance(token_manager.to_account_info().data_len());
            let token_manager_lamports = token_manager.to_account_info().lamports();
            if token_manager_lamports > required_lamports {
                let diff = token_manager_lamports.checked_sub(required_lamports).expect("Sub error");
                **token_manager.to_account_info().try_borrow_mut_lamports()? = required_lamports;
                **ctx.accounts.collector.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.collector.to_account_info().lamports().checked_add(diff).expect("Add error");
            };
        }
        t if t == InvalidationType::Release as u8 => {
            match token_manager.kind {
                k if k == TokenManagerKind::Programmable as u8 => {
                    // get PDA seeds to sign with
                    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), token_manager.mint.as_ref(), &[token_manager.bump]];
                    let token_manager_signer = &[&token_manager_seeds[..]];

                    let recipient_token_account_owner_info = next_account_info(remaining_accs)?;
                    let payer_info = next_account_info(remaining_accs)?;
                    let system_program_info = next_account_info(remaining_accs)?;
                    let token_manager_token_record = next_account_info(remaining_accs)?;
                    let mint_info = next_account_info(remaining_accs)?;
                    let mint_metadata_info = next_account_info(remaining_accs)?;
                    let mint_edition_info = next_account_info(remaining_accs)?;
                    let from_token_record = next_account_info(remaining_accs)?;
                    let sysvar_instructions_info = next_account_info(remaining_accs)?;
                    let associated_token_program_info = next_account_info(remaining_accs)?;
                    let authorization_rules_program_info = next_account_info(remaining_accs)?;
                    let authorization_rules_info = next_account_info(remaining_accs)?;

                    invoke_signed(
                        &UnlockV1 {
                            authority: token_manager.key(),
                            token_owner: Some(recipient_token_account_owner_info.key()),
                            token: ctx.accounts.recipient_token_account.owner,
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(from_token_record.key()),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
                            sysvar_instructions: sysvar_instructions_info.key(),
                            spl_token_program: Some(ctx.accounts.token_program.key()),
                            authorization_rules_program: Some(authorization_rules_program_info.key()),
                            authorization_rules: Some(authorization_rules_info.key()),
                        }
                        .instruction(UnlockV1InstructionArgs { authorization_data: None }),
                        &[
                            token_manager.to_account_info(),
                            recipient_token_account_owner_info.to_account_info(),
                            ctx.accounts.recipient_token_account.to_account_info(),
                            mint_info.to_account_info(),
                            ctx.accounts.recipient_token_account.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            from_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;

                    invoke_signed(
                        &TransferV1 {
                            token: ctx.accounts.recipient_token_account.key(),
                            token_owner: recipient_token_account_owner_info.key(),
                            destination_token: ctx.accounts.token_manager_token_account.key(),
                            destination_owner: token_manager.key(),
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(from_token_record.key()),
                            destination_token_record: Some(token_manager_token_record.key()),
                            authority: token_manager.key(),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
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
                            ctx.accounts.recipient_token_account.to_account_info(),
                            recipient_token_account_owner_info.to_account_info(),
                            ctx.accounts.token_manager_token_account.to_account_info(),
                            token_manager.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            from_token_record.to_account_info(),
                            token_manager_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            associated_token_program_info.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;

                    invoke_signed(
                        &TransferV1 {
                            token: ctx.accounts.token_manager_token_account.key(),
                            token_owner: token_manager.key(),
                            destination_token: ctx.accounts.recipient_token_account.key(),
                            destination_owner: recipient_token_account_owner_info.key(),
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(token_manager_token_record.key()),
                            destination_token_record: Some(from_token_record.key()),
                            authority: token_manager.key(),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
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
                            recipient_token_account_owner_info.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            token_manager_token_record.to_account_info(),
                            from_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            associated_token_program_info.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;
                }
                _ => {
                    // https://github.com/solana-labs/solana-program-library/pull/2872
                    // remove delegate
                    // let cpi_accounts = Revoke {
                    //     source: ctx.accounts.recipient_token_account.to_account_info(),
                    //     authority: token_manager.to_account_info(),
                    // };
                    // let cpi_program = ctx.accounts.token_program.to_account_info();
                    // let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    // token::revoke(cpi_context)?;

                    // transfer to token_manager
                    let cpi_accounts = Transfer {
                        from: ctx.accounts.recipient_token_account.to_account_info(),
                        to: ctx.accounts.token_manager_token_account.to_account_info(),
                        authority: token_manager.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    token::transfer(cpi_context, token_manager.amount)?;

                    // transfer back to receipient unlocked
                    let cpi_accounts = Transfer {
                        from: ctx.accounts.token_manager_token_account.to_account_info(),
                        to: ctx.accounts.recipient_token_account.to_account_info(),
                        authority: token_manager.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    token::transfer(cpi_context, token_manager.amount)?;
                }
            }

            // close token_manager_token_account
            let cpi_accounts = CloseAccount {
                account: ctx.accounts.token_manager_token_account.to_account_info(),
                destination: ctx.accounts.collector.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::close_account(cpi_context)?;

            // close token_manager
            token_manager.state = TokenManagerState::Invalidated as u8;
            token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
            token_manager.close(ctx.accounts.collector.to_account_info())?;
        }
        t if t == InvalidationType::Reissue as u8 => {
            match token_manager.kind {
                k if k == TokenManagerKind::Programmable as u8 => {
                    // get PDA seeds to sign with
                    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), token_manager.mint.as_ref(), &[token_manager.bump]];
                    let token_manager_signer = &[&token_manager_seeds[..]];

                    let recipient_token_account_owner_info = next_account_info(remaining_accs)?;
                    let payer_info = next_account_info(remaining_accs)?;
                    let system_program_info = next_account_info(remaining_accs)?;
                    let token_manager_token_record = next_account_info(remaining_accs)?;
                    let mint_info = next_account_info(remaining_accs)?;
                    let mint_metadata_info = next_account_info(remaining_accs)?;
                    let mint_edition_info = next_account_info(remaining_accs)?;
                    let from_token_record = next_account_info(remaining_accs)?;
                    let sysvar_instructions_info = next_account_info(remaining_accs)?;
                    let associated_token_program_info = next_account_info(remaining_accs)?;
                    let authorization_rules_program_info = next_account_info(remaining_accs)?;
                    let authorization_rules_info = next_account_info(remaining_accs)?;

                    invoke_signed(
                        &UnlockV1 {
                            authority: token_manager.key(),
                            token_owner: Some(recipient_token_account_owner_info.key()),
                            token: ctx.accounts.recipient_token_account.owner,
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(from_token_record.key()),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
                            sysvar_instructions: sysvar_instructions_info.key(),
                            spl_token_program: Some(ctx.accounts.token_program.key()),
                            authorization_rules_program: Some(authorization_rules_program_info.key()),
                            authorization_rules: Some(authorization_rules_info.key()),
                        }
                        .instruction(UnlockV1InstructionArgs { authorization_data: None }),
                        &[
                            token_manager.to_account_info(),
                            recipient_token_account_owner_info.to_account_info(),
                            ctx.accounts.recipient_token_account.to_account_info(),
                            mint_info.to_account_info(),
                            ctx.accounts.recipient_token_account.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            from_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;

                    invoke_signed(
                        &TransferV1 {
                            token: ctx.accounts.recipient_token_account.key(),
                            token_owner: recipient_token_account_owner_info.key(),
                            destination_token: ctx.accounts.token_manager_token_account.key(),
                            destination_owner: token_manager.key(),
                            mint: mint_info.key(),
                            metadata: mint_metadata_info.key(),
                            edition: Some(mint_edition_info.key()),
                            token_record: Some(from_token_record.key()),
                            destination_token_record: Some(token_manager_token_record.key()),
                            authority: token_manager.key(),
                            payer: payer_info.key(),
                            system_program: system_program_info.key(),
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
                            ctx.accounts.recipient_token_account.to_account_info(),
                            recipient_token_account_owner_info.to_account_info(),
                            ctx.accounts.token_manager_token_account.to_account_info(),
                            token_manager.to_account_info(),
                            mint_info.to_account_info(),
                            mint_metadata_info.to_account_info(),
                            mint_edition_info.to_account_info(),
                            from_token_record.to_account_info(),
                            token_manager_token_record.to_account_info(),
                            payer_info.to_account_info(),
                            system_program_info.to_account_info(),
                            sysvar_instructions_info.to_account_info(),
                            ctx.accounts.token_program.to_account_info(),
                            associated_token_program_info.to_account_info(),
                            authorization_rules_program_info.to_account_info(),
                            authorization_rules_info.to_account_info(),
                        ],
                        token_manager_signer,
                    )?;
                }
                _ => {
                    // transfer back to token_manager
                    let cpi_accounts = Transfer {
                        from: ctx.accounts.recipient_token_account.to_account_info(),
                        to: ctx.accounts.token_manager_token_account.to_account_info(),
                        authority: token_manager.to_account_info(),
                    };
                    let cpi_program = ctx.accounts.token_program.to_account_info();
                    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
                    token::transfer(cpi_context, token_manager.amount)?;
                }
            }

            token_manager.state = TokenManagerState::Issued as u8;
            token_manager.recipient_token_account = ctx.accounts.token_manager_token_account.key();
            token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;

            let required_lamports = ctx.accounts.rent.minimum_balance(token_manager.to_account_info().data_len());
            let token_manager_lamports = token_manager.to_account_info().lamports();
            if token_manager_lamports > required_lamports {
                let diff = token_manager_lamports.checked_sub(required_lamports).expect("Sub error");
                **token_manager.to_account_info().try_borrow_mut_lamports()? = required_lamports;
                **ctx.accounts.collector.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.collector.to_account_info().lamports().checked_add(diff).expect("Add error");
            };
        }
        _ => return Err(error!(ErrorCode::InvalidInvalidationType)),
    }

    Ok(())
}
