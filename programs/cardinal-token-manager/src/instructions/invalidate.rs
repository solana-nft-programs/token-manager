use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::AccountsClose;
use anchor_spl::token;
use anchor_spl::token::CloseAccount;
use anchor_spl::token::Mint;
use anchor_spl::token::ThawAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use core::slice::Iter;
use mpl_token_metadata::instruction::thaw_delegated_account;
use mpl_token_metadata::instruction::MetadataInstruction;
use mpl_token_metadata::instruction::TransferArgs;
use mpl_token_metadata::instruction::UnlockArgs;
use mpl_token_metadata::state::Metadata;
use mpl_token_metadata::state::TokenStandard;
use mpl_token_metadata::utils::assert_derivation;
use solana_program::instruction::Instruction;

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
    let mutable_ctx = &mut Context::new(&ctx.program_id, ctx.accounts, ctx.remaining_accounts, ctx.bumps);
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    let peekable_remaining_accs = &mut ctx.remaining_accounts.iter().peekable();

    // specific check for pnft token managers
    let token_manager = &mut mutable_ctx.accounts.token_manager;
    if token_manager.kind != TokenManagerKind::Programmable as u8 {
        // look at next account
        if let Some(next_account) = peekable_remaining_accs.peek() {
            if next_account.owner == &mpl_token_metadata::id() {
                let mint_metadata_data = next_account.try_borrow_mut_data().expect("Failed to borrow data");
                if let Ok(metadata) = Metadata::deserialize(&mut mint_metadata_data.as_ref()) {
                    // migrated pnft
                    if metadata.token_standard == Some(TokenStandard::ProgrammableNonFungible) && metadata.mint == token_manager.mint {
                        // pop this account and update type
                        next_account_info(remaining_accs)?;
                        token_manager.kind = TokenManagerKind::Programmable as u8;
                    }
                }
            }
        }
    }

    // state x kind
    match (
        TokenManagerState::from(mutable_ctx.accounts.token_manager.state),
        TokenManagerKind::from(mutable_ctx.accounts.token_manager.kind),
    ) {
        (TokenManagerState::Claimed, TokenManagerKind::Managed) => thaw_non_edition(mutable_ctx, remaining_accs)?,
        (TokenManagerState::Claimed, TokenManagerKind::Permissioned) => thaw_non_edition(mutable_ctx, remaining_accs)?,
        (TokenManagerState::Claimed, TokenManagerKind::Edition) => thaw_edition(mutable_ctx, remaining_accs)?,
        _ => return Err(error!(ErrorCode::InvalidTokenManagerState)),
    }

    // state x invalidation type
    match (
        TokenManagerState::from(mutable_ctx.accounts.token_manager.state),
        InvalidationType::from(mutable_ctx.accounts.token_manager.invalidation_type),
    ) {
        (TokenManagerState::Issued, InvalidationType::Vest) => release_unclaimed_vesting(mutable_ctx, remaining_accs)?,
        (TokenManagerState::Issued, _) => return_invalidation(mutable_ctx, remaining_accs)?,
        _ => return Err(error!(ErrorCode::InvalidTokenManagerState)),
    }

    // // kind x invalidation type
    match (
        TokenManagerKind::from(mutable_ctx.accounts.token_manager.kind),
        InvalidationType::from(mutable_ctx.accounts.token_manager.invalidation_type),
    ) {
        // Managed
        (TokenManagerKind::Managed, InvalidationType::Return) => return_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Managed, InvalidationType::Invalidate) => invalidate_invalidation(mutable_ctx)?,
        (TokenManagerKind::Managed, InvalidationType::Release) => release_invalidation(mutable_ctx)?,
        (TokenManagerKind::Managed, InvalidationType::Reissue) => reissue_invalidation(mutable_ctx)?,
        (TokenManagerKind::Managed, InvalidationType::Vest) => vest_invalidation(mutable_ctx, remaining_accs)?,
        // Editions
        (TokenManagerKind::Edition, InvalidationType::Return) => return_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Edition, InvalidationType::Invalidate) => invalidate_invalidation(mutable_ctx)?,
        (TokenManagerKind::Edition, InvalidationType::Release) => release_invalidation(mutable_ctx)?,
        (TokenManagerKind::Edition, InvalidationType::Reissue) => reissue_invalidation(mutable_ctx)?,
        (TokenManagerKind::Edition, InvalidationType::Vest) => vest_invalidation(mutable_ctx, remaining_accs)?,
        // Programmable
        (TokenManagerKind::Programmable, InvalidationType::Return) => return_pnft_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Programmable, InvalidationType::Release) => release_pnft_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Programmable, InvalidationType::Invalidate) => todo!(),
        (TokenManagerKind::Programmable, InvalidationType::Reissue) => reissue_pnft_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Programmable, InvalidationType::Vest) => todo!(),
        // Permissioned
        (TokenManagerKind::Permissioned, InvalidationType::Return) => return_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Permissioned, InvalidationType::Invalidate) => invalidate_invalidation(mutable_ctx)?,
        (TokenManagerKind::Permissioned, InvalidationType::Release) => release_invalidation(mutable_ctx)?,
        (TokenManagerKind::Permissioned, InvalidationType::Reissue) => reissue_invalidation(mutable_ctx)?,
        (TokenManagerKind::Permissioned, InvalidationType::Vest) => vest_invalidation(mutable_ctx, remaining_accs)?,
        // Unmanaged
        (TokenManagerKind::Unmanaged, InvalidationType::Return) => return_invalidation(mutable_ctx, remaining_accs)?,
        (TokenManagerKind::Unmanaged, InvalidationType::Invalidate) => invalidate_invalidation(mutable_ctx)?,
        (TokenManagerKind::Unmanaged, InvalidationType::Release) => release_invalidation(mutable_ctx)?,
        (TokenManagerKind::Unmanaged, InvalidationType::Reissue) => reissue_invalidation(mutable_ctx)?,
        (TokenManagerKind::Unmanaged, InvalidationType::Vest) => vest_invalidation(mutable_ctx, remaining_accs)?,
    };

    Ok(())
}

pub fn reissue_pnft_invalidation<'key, 'accounts, 'remaining, 'info>(
    ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>,
    remaining_accs: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // 0. `[signer]` Delegate
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // 1. `[optional]` Token owner
                AccountMeta::new_readonly(recipient_token_account_owner_info.key(), false),
                // 2. `[writable]` Token account
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // 3. `[]` Mint account
                AccountMeta::new_readonly(mint_info.key(), false),
                // 4. `[writable]` Metadata account
                AccountMeta::new(mint_metadata_info.key(), false),
                // 5. `[optional]` Edition account
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // 6. `[optional, writable]` Token record account
                AccountMeta::new(from_token_record.key(), false),
                // 7. `[signer, writable]` Payer
                AccountMeta::new(payer_info.key(), true),
                // 8. `[]` System Program
                AccountMeta::new_readonly(system_program_info.key(), false),
                // 9. `[]` Instructions sysvar account
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // 10. `[optional]` SPL Token Program
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // 11. `[optional]` Token Authorization Rules program
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // 12. `[optional]` Token Authorization Rules account
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Unlock(UnlockArgs::V1 { authorization_data: None }).try_to_vec().unwrap(),
        },
        &[
            ctx.accounts.token_manager.to_account_info(),
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // #[account(0, writable, name="token", desc="Token account")]
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // #[account(1, name="token_owner", desc="Token account owner")]
                AccountMeta::new_readonly(ctx.accounts.recipient_token_account.owner.key(), false),
                // #[account(2, writable, name="destination", desc="Destination token account")]
                AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                // #[account(3, name="destination_owner", desc="Destination token account owner")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), false),
                // #[account(4, name="mint", desc="Mint of token asset")]
                AccountMeta::new_readonly(mint_info.key(), false),
                // #[account(5, writable, name="metadata", desc="Metadata (pda of ['metadata', program id, mint id])")]
                AccountMeta::new(mint_metadata_info.key(), false),
                // #[account(6, optional, name="edition", desc="Edition of token asset")]
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // #[account(7, optional, writable, name="recipient_token_record", desc="Owner token record account")]
                AccountMeta::new(from_token_record.key(), false),
                // #[account(8, optional, writable, name="destination_token_record", desc="Destination token record account")]
                AccountMeta::new(token_manager_token_record.key(), false),
                // #[account(9, signer, name="authority", desc="Transfer authority (token owner or delegate)")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // #[account(10, signer, writable, name="payer", desc="Payer")]
                AccountMeta::new(payer_info.key(), true),
                // #[account(11, name="system_program", desc="System Program")]
                AccountMeta::new_readonly(system_program_info.key(), false),
                // #[account(12, name="sysvar_instructions", desc="Instructions sysvar account")]
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // #[account(13, name="spl_token_program", desc="SPL Token Program")]
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // #[account(14, name="spl_ata_program", desc="SPL Associated Token Account program")]
                AccountMeta::new_readonly(associated_token_program_info.key(), false),
                // #[account(15, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // #[account(16, optional, name="authorization_rules", desc="Token Authorization Rules account")]
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Transfer(TransferArgs::V1 {
                amount: ctx.accounts.token_manager.amount,
                authorization_data: None,
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            ctx.accounts.recipient_token_account.to_account_info(),
            recipient_token_account_owner_info.to_account_info(),
            ctx.accounts.token_manager_token_account.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
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

    ctx.accounts.token_manager.state = TokenManagerState::Issued as u8;
    ctx.accounts.token_manager.recipient_token_account = ctx.accounts.token_manager_token_account.key();
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    let required_lamports = ctx.accounts.rent.minimum_balance(ctx.accounts.token_manager.to_account_info().data_len());
    let token_manager_lamports = ctx.accounts.token_manager.to_account_info().lamports();
    if token_manager_lamports > required_lamports {
        let diff = token_manager_lamports.checked_sub(required_lamports).expect("Sub error");
        **ctx.accounts.token_manager.to_account_info().try_borrow_mut_lamports()? = required_lamports;
        **ctx.accounts.collector.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.collector.to_account_info().lamports().checked_add(diff).expect("Add error");
    };

    Ok(())
}
pub fn thaw_non_edition<'key, 'accounts, 'remaining, 'info>(ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>, remaining_accs: &mut Iter<AccountInfo<'info>>) -> Result<()> {
    let mint_manager_info = next_account_info(remaining_accs)?;

    // update mint manager
    let mut mint_manager = Account::<MintManager>::try_from(mint_manager_info)?;
    mint_manager.token_managers = mint_manager.token_managers.checked_sub(1).expect("Sub error");
    mint_manager.exit(ctx.program_id)?;

    let path = &[MINT_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref()];
    let bump_seed = assert_derivation(ctx.program_id, mint_manager_info, path)?;
    let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[bump_seed]];
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

    Ok(())
}

fn release_unclaimed_vesting<'key, 'accounts, 'remaining, 'info>(
    ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>,
    remaining_accs: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // find claim_approver token account
    let claim_approver_token_account_info = next_account_info(remaining_accs)?;
    let claim_approver_token_account = Account::<TokenAccount>::try_from(claim_approver_token_account_info)?;
    if claim_approver_token_account.owner != ctx.accounts.token_manager.claim_approver.expect("No claim approver found") {
        return Err(error!(ErrorCode::InvalidReceiptMintOwner));
    }

    // transfer to claim_approver
    let cpi_accounts = Transfer {
        from: ctx.accounts.token_manager_token_account.to_account_info(),
        to: claim_approver_token_account.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

    Ok(())
}

pub fn return_invalidation<'key, 'accounts, 'remaining, 'info>(
    ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>,
    remaining_accs: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // find receipt holder
    let return_token_account_info = next_account_info(remaining_accs)?;
    let return_token_account = Account::<TokenAccount>::try_from(return_token_account_info)?;
    if ctx.accounts.token_manager.receipt_mint.is_none() {
        if return_token_account.owner != ctx.accounts.token_manager.issuer {
            return Err(error!(ErrorCode::InvalidIssuerTokenAccount));
        }
    } else {
        let receipt_token_account_info = next_account_info(remaining_accs)?;
        let receipt_token_account = Account::<TokenAccount>::try_from(receipt_token_account_info)?;
        if !(receipt_token_account.mint == ctx.accounts.token_manager.receipt_mint.expect("No receipt mint") && receipt_token_account.amount > 0) {
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
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    // close token_manager
    ctx.accounts.token_manager.state = TokenManagerState::Invalidated as u8;
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    ctx.accounts.token_manager.close(ctx.accounts.collector.to_account_info())?;

    Ok(())
}

pub fn invalidate_invalidation<'key, 'accounts, 'remaining, 'info>(ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    // mark invalid
    ctx.accounts.token_manager.state = TokenManagerState::Invalidated as u8;
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;

    let required_lamports = ctx.accounts.rent.minimum_balance(ctx.accounts.token_manager.to_account_info().data_len());
    let token_manager_lamports = ctx.accounts.token_manager.to_account_info().lamports();
    if token_manager_lamports > required_lamports {
        let diff = token_manager_lamports.checked_sub(required_lamports).expect("Sub error");
        **ctx.accounts.token_manager.to_account_info().try_borrow_mut_lamports()? = required_lamports;
        **ctx.accounts.collector.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.collector.to_account_info().lamports().checked_add(diff).expect("Add error");
    };

    Ok(())
}

pub fn thaw_edition<'key, 'accounts, 'remaining, 'info>(ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>, remaining_accs: &mut Iter<AccountInfo<'info>>) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let edition_info = next_account_info(remaining_accs)?;
    let metadata_program = next_account_info(remaining_accs)?;
    // edition will be validated by metadata_program
    if metadata_program.key() != mpl_token_metadata::id() {
        return Err(error!(ErrorCode::InvalidMetadataProgramId));
    }
    invoke_signed(
        &thaw_delegated_account(
            *metadata_program.key,
            ctx.accounts.token_manager.key(),
            ctx.accounts.recipient_token_account.key(),
            *edition_info.key,
            ctx.accounts.mint.key(),
        ),
        &[
            ctx.accounts.token_manager.to_account_info(),
            ctx.accounts.recipient_token_account.to_account_info(),
            edition_info.to_account_info(),
            ctx.accounts.mint.to_account_info(),
        ],
        &[token_manager_seeds],
    )?;

    Ok(())
}

pub fn reissue_invalidation<'key, 'accounts, 'remaining, 'info>(ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // transfer back to token_manager
    let cpi_accounts = Transfer {
        from: ctx.accounts.recipient_token_account.to_account_info(),
        to: ctx.accounts.token_manager_token_account.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

    ctx.accounts.token_manager.state = TokenManagerState::Issued as u8;
    ctx.accounts.token_manager.recipient_token_account = ctx.accounts.token_manager_token_account.key();
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;

    let required_lamports = ctx.accounts.rent.minimum_balance(ctx.accounts.token_manager.to_account_info().data_len());
    let token_manager_lamports = ctx.accounts.token_manager.to_account_info().lamports();
    if token_manager_lamports > required_lamports {
        let diff = token_manager_lamports.checked_sub(required_lamports).expect("Sub error");
        **ctx.accounts.token_manager.to_account_info().try_borrow_mut_lamports()? = required_lamports;
        **ctx.accounts.collector.to_account_info().try_borrow_mut_lamports()? = ctx.accounts.collector.to_account_info().lamports().checked_add(diff).expect("Add error");
    };

    Ok(())
}

pub fn release_pnft_invalidation<'key, 'accounts, 'remaining, 'info>(
    ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>,
    remaining_accs: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // 0. `[signer]` Delegate
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // 1. `[optional]` Token owner
                AccountMeta::new_readonly(recipient_token_account_owner_info.key(), false),
                // 2. `[writable]` Token account
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // 3. `[]` Mint account
                AccountMeta::new_readonly(mint_info.key(), false),
                // 4. `[writable]` Metadata account
                AccountMeta::new(mint_metadata_info.key(), false),
                // 5. `[optional]` Edition account
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // 6. `[optional, writable]` Token record account
                AccountMeta::new(from_token_record.key(), false),
                // 7. `[signer, writable]` Payer
                AccountMeta::new(payer_info.key(), true),
                // 8. `[]` System Program
                AccountMeta::new_readonly(system_program_info.key(), false),
                // 9. `[]` Instructions sysvar account
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // 10. `[optional]` SPL Token Program
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // 11. `[optional]` Token Authorization Rules program
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // 12. `[optional]` Token Authorization Rules account
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Unlock(UnlockArgs::V1 { authorization_data: None }).try_to_vec().unwrap(),
        },
        &[
            ctx.accounts.token_manager.to_account_info(),
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // #[account(0, writable, name="token", desc="Token account")]
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // #[account(1, name="token_owner", desc="Token account owner")]
                AccountMeta::new_readonly(ctx.accounts.recipient_token_account.owner.key(), false),
                // #[account(2, writable, name="destination", desc="Destination token account")]
                AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                // #[account(3, name="destination_owner", desc="Destination token account owner")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), false),
                // #[account(4, name="mint", desc="Mint of token asset")]
                AccountMeta::new_readonly(mint_info.key(), false),
                // #[account(5, writable, name="metadata", desc="Metadata (pda of ['metadata', program id, mint id])")]
                AccountMeta::new(mint_metadata_info.key(), false),
                // #[account(6, optional, name="edition", desc="Edition of token asset")]
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // #[account(7, optional, writable, name="recipient_token_record", desc="Owner token record account")]
                AccountMeta::new(from_token_record.key(), false),
                // #[account(8, optional, writable, name="destination_token_record", desc="Destination token record account")]
                AccountMeta::new(token_manager_token_record.key(), false),
                // #[account(9, signer, name="authority", desc="Transfer authority (token owner or delegate)")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // #[account(10, signer, writable, name="payer", desc="Payer")]
                AccountMeta::new(payer_info.key(), true),
                // #[account(11, name="system_program", desc="System Program")]
                AccountMeta::new_readonly(system_program_info.key(), false),
                // #[account(12, name="sysvar_instructions", desc="Instructions sysvar account")]
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // #[account(13, name="spl_token_program", desc="SPL Token Program")]
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // #[account(14, name="spl_ata_program", desc="SPL Associated Token Account program")]
                AccountMeta::new_readonly(associated_token_program_info.key(), false),
                // #[account(15, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // #[account(16, optional, name="authorization_rules", desc="Token Authorization Rules account")]
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Transfer(TransferArgs::V1 {
                amount: ctx.accounts.token_manager.amount,
                authorization_data: None,
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            ctx.accounts.recipient_token_account.to_account_info(),
            recipient_token_account_owner_info.to_account_info(),
            ctx.accounts.token_manager_token_account.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // #[account(0, writable, name="token", desc="Token account")]
                AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                // #[account(1, name="token_owner", desc="Token account owner")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), false),
                // #[account(2, writable, name="destination", desc="Destination token account")]
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // #[account(3, name="destination_owner", desc="Destination token account owner")]
                AccountMeta::new_readonly(recipient_token_account_owner_info.key(), false),
                // #[account(4, name="mint", desc="Mint of token asset")]
                AccountMeta::new_readonly(mint_info.key(), false),
                // #[account(5, writable, name="metadata", desc="Metadata (pda of ['metadata', program id, mint id])")]
                AccountMeta::new(mint_metadata_info.key(), false),
                // #[account(6, optional, name="edition", desc="Edition of token asset")]
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // #[account(7, optional, writable, name="recipient_token_record", desc="Owner token record account")]
                AccountMeta::new(token_manager_token_record.key(), false),
                // #[account(8, optional, writable, name="destination_token_record", desc="Destination token record account")]
                AccountMeta::new(from_token_record.key(), false),
                // #[account(9, signer, name="authority", desc="Transfer authority (token owner or delegate)")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // #[account(10, signer, writable, name="payer", desc="Payer")]
                AccountMeta::new(payer_info.key(), true),
                // #[account(11, name="system_program", desc="System Program")]
                AccountMeta::new_readonly(system_program_info.key(), false),
                // #[account(12, name="sysvar_instructions", desc="Instructions sysvar account")]
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // #[account(13, name="spl_token_program", desc="SPL Token Program")]
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // #[account(14, name="spl_ata_program", desc="SPL Associated Token Account program")]
                AccountMeta::new_readonly(associated_token_program_info.key(), false),
                // #[account(15, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // #[account(16, optional, name="authorization_rules", desc="Token Authorization Rules account")]
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Transfer(TransferArgs::V1 {
                amount: ctx.accounts.token_manager.amount,
                authorization_data: None,
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            ctx.accounts.token_manager_token_account.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
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

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    // close token_manager
    ctx.accounts.token_manager.state = TokenManagerState::Invalidated as u8;
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    ctx.accounts.token_manager.close(ctx.accounts.collector.to_account_info())?;

    Ok(())
}

pub fn return_pnft_invalidation<'key, 'accounts, 'remaining, 'info>(
    ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>,
    remaining_accs: &mut Iter<AccountInfo<'info>>,
) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // find receipt holder
    let return_token_account_info = next_account_info(remaining_accs)?;
    let return_token_account = Account::<TokenAccount>::try_from(return_token_account_info)?;
    let return_token_account_owner_info = next_account_info(remaining_accs)?;
    if return_token_account.owner != return_token_account_owner_info.key() {
        return Err(error!(ErrorCode::InvalidReturnTarget));
    }

    if ctx.accounts.token_manager.receipt_mint.is_none() {
        if return_token_account.owner != ctx.accounts.token_manager.issuer {
            return Err(error!(ErrorCode::InvalidIssuerTokenAccount));
        }
    } else {
        let receipt_token_account_info = next_account_info(remaining_accs)?;
        let receipt_token_account = Account::<TokenAccount>::try_from(receipt_token_account_info)?;
        if !(receipt_token_account.mint == ctx.accounts.token_manager.receipt_mint.expect("No receipt mint") && receipt_token_account.amount > 0) {
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // 0. `[signer]` Delegate
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // 1. `[optional]` Token owner
                AccountMeta::new_readonly(recipient_token_account_owner_info.key(), false),
                // 2. `[writable]` Token account
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // 3. `[]` Mint account
                AccountMeta::new_readonly(mint_info.key(), false),
                // 4. `[writable]` Metadata account
                AccountMeta::new(mint_metadata_info.key(), false),
                // 5. `[optional]` Edition account
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // 6. `[optional, writable]` Token record account
                AccountMeta::new(from_token_record.key(), false),
                // 7. `[signer, writable]` Payer
                AccountMeta::new(payer_info.key(), true),
                // 8. `[]` System Program
                AccountMeta::new_readonly(system_program_info.key(), false),
                // 9. `[]` Instructions sysvar account
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // 10. `[optional]` SPL Token Program
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // 11. `[optional]` Token Authorization Rules program
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // 12. `[optional]` Token Authorization Rules account
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Unlock(UnlockArgs::V1 { authorization_data: None }).try_to_vec().unwrap(),
        },
        &[
            ctx.accounts.token_manager.to_account_info(),
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // #[account(0, writable, name="token", desc="Token account")]
                AccountMeta::new(ctx.accounts.recipient_token_account.key(), false),
                // #[account(1, name="token_owner", desc="Token account owner")]
                AccountMeta::new_readonly(ctx.accounts.recipient_token_account.owner.key(), false),
                // #[account(2, writable, name="destination", desc="Destination token account")]
                AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                // #[account(3, name="destination_owner", desc="Destination token account owner")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), false),
                // #[account(4, name="mint", desc="Mint of token asset")]
                AccountMeta::new_readonly(mint_info.key(), false),
                // #[account(5, writable, name="metadata", desc="Metadata (pda of ['metadata', program id, mint id])")]
                AccountMeta::new(mint_metadata_info.key(), false),
                // #[account(6, optional, name="edition", desc="Edition of token asset")]
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // #[account(7, optional, writable, name="recipient_token_record", desc="Owner token record account")]
                AccountMeta::new(from_token_record.key(), false),
                // #[account(8, optional, writable, name="destination_token_record", desc="Destination token record account")]
                AccountMeta::new(token_manager_token_record.key(), false),
                // #[account(9, signer, name="authority", desc="Transfer authority (token owner or delegate)")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // #[account(10, signer, writable, name="payer", desc="Payer")]
                AccountMeta::new(payer_info.key(), true),
                // #[account(11, name="system_program", desc="System Program")]
                AccountMeta::new_readonly(system_program_info.key(), false),
                // #[account(12, name="sysvar_instructions", desc="Instructions sysvar account")]
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // #[account(13, name="spl_token_program", desc="SPL Token Program")]
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // #[account(14, name="spl_ata_program", desc="SPL Associated Token Account program")]
                AccountMeta::new_readonly(associated_token_program_info.key(), false),
                // #[account(15, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // #[account(16, optional, name="authorization_rules", desc="Token Authorization Rules account")]
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Transfer(TransferArgs::V1 {
                amount: ctx.accounts.token_manager.amount,
                authorization_data: None,
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            ctx.accounts.recipient_token_account.to_account_info(),
            recipient_token_account_owner_info.to_account_info(),
            ctx.accounts.token_manager_token_account.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
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
        &Instruction {
            program_id: mpl_token_metadata::id(),
            accounts: vec![
                // #[account(0, writable, name="token", desc="Token account")]
                AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                // #[account(1, name="token_owner", desc="Token account owner")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), false),
                // #[account(2, writable, name="destination", desc="Destination token account")]
                AccountMeta::new(return_token_account_info.key(), false),
                // #[account(3, name="destination_owner", desc="Destination token account owner")]
                AccountMeta::new_readonly(return_token_account_owner_info.key(), false),
                // #[account(4, name="mint", desc="Mint of token asset")]
                AccountMeta::new_readonly(mint_info.key(), false),
                // #[account(5, writable, name="metadata", desc="Metadata (pda of ['metadata', program id, mint id])")]
                AccountMeta::new(mint_metadata_info.key(), false),
                // #[account(6, optional, name="edition", desc="Edition of token asset")]
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                // #[account(7, optional, writable, name="recipient_token_record", desc="Owner token record account")]
                AccountMeta::new(token_manager_token_record.key(), false),
                // #[account(8, optional, writable, name="destination_token_record", desc="Destination token record account")]
                AccountMeta::new(to_token_record.key(), false),
                // #[account(9, signer, name="authority", desc="Transfer authority (token owner or delegate)")]
                AccountMeta::new_readonly(ctx.accounts.token_manager.key(), true),
                // #[account(10, signer, writable, name="payer", desc="Payer")]
                AccountMeta::new(payer_info.key(), true),
                // #[account(11, name="system_program", desc="System Program")]
                AccountMeta::new_readonly(system_program_info.key(), false),
                // #[account(12, name="sysvar_instructions", desc="Instructions sysvar account")]
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                // #[account(13, name="spl_token_program", desc="SPL Token Program")]
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                // #[account(14, name="spl_ata_program", desc="SPL Associated Token Account program")]
                AccountMeta::new_readonly(associated_token_program_info.key(), false),
                // #[account(15, optional, name="authorization_rules_program", desc="Token Authorization Rules Program")]
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                // #[account(16, optional, name="authorization_rules", desc="Token Authorization Rules account")]
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ],
            data: MetadataInstruction::Transfer(TransferArgs::V1 {
                amount: ctx.accounts.token_manager.amount,
                authorization_data: None,
            })
            .try_to_vec()
            .unwrap(),
        },
        &[
            ctx.accounts.token_manager_token_account.to_account_info(),
            ctx.accounts.token_manager.to_account_info(),
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
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    // close token_manager
    ctx.accounts.token_manager.state = TokenManagerState::Invalidated as u8;
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    ctx.accounts.token_manager.close(ctx.accounts.collector.to_account_info())?;

    Ok(())
}

pub fn release_invalidation<'key, 'accounts, 'remaining, 'info>(ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // transfer to token_manager
    let cpi_accounts = Transfer {
        from: ctx.accounts.recipient_token_account.to_account_info(),
        to: ctx.accounts.token_manager_token_account.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

    // transfer back to receipient unlocked
    let cpi_accounts = Transfer {
        from: ctx.accounts.token_manager_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    // close token_manager
    ctx.accounts.token_manager.state = TokenManagerState::Invalidated as u8;
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    ctx.accounts.token_manager.close(ctx.accounts.collector.to_account_info())?;

    Ok(())
}

pub fn vest_invalidation<'key, 'accounts, 'remaining, 'info>(ctx: &mut Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>, remaining_accs: &mut Iter<AccountInfo<'info>>) -> Result<()> {
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), ctx.accounts.token_manager.mint.as_ref(), &[ctx.accounts.token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    if ctx.accounts.token_manager.state == TokenManagerState::Issued as u8 {
        // find claim_approver token account
        let claim_approver_token_account_info = next_account_info(remaining_accs)?;
        let claim_approver_token_account = Account::<TokenAccount>::try_from(claim_approver_token_account_info)?;
        if claim_approver_token_account.owner != ctx.accounts.token_manager.claim_approver.expect("No claim approver found") {
            return Err(error!(ErrorCode::InvalidReceiptMintOwner));
        }

        // transfer to claim_approver
        let cpi_accounts = Transfer {
            from: ctx.accounts.token_manager_token_account.to_account_info(),
            to: claim_approver_token_account.to_account_info(),
            authority: ctx.accounts.token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;
    } else {
        // transfer to token_manager to clear the delegate
        let cpi_accounts = Transfer {
            from: ctx.accounts.recipient_token_account.to_account_info(),
            to: ctx.accounts.token_manager_token_account.to_account_info(),
            authority: ctx.accounts.token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;

        // transfer back to receipient unlocked
        let cpi_accounts = Transfer {
            from: ctx.accounts.token_manager_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::transfer(cpi_context, ctx.accounts.token_manager.amount)?;
    }

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: ctx.accounts.token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;

    // close token_manager
    ctx.accounts.token_manager.state = TokenManagerState::Invalidated as u8;
    ctx.accounts.token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    ctx.accounts.token_manager.close(ctx.accounts.collector.to_account_info())?;

    Ok(())
}
