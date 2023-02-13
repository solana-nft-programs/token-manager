use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::AccountsClose;
use anchor_spl::token::CloseAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};
use mpl_token_metadata::instruction::MetadataInstruction;
use mpl_token_metadata::instruction::TransferArgs;
use mpl_token_metadata::state::Metadata;
use mpl_token_metadata::state::TokenStandard;
use mpl_token_metadata::utils::assert_derivation;
use solana_program::instruction::Instruction;
use solana_program::program::invoke_signed;

#[derive(Accounts)]
pub struct UnissueCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Issued as u8)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = token_manager_token_account.owner == token_manager.key() @ ErrorCode::InvalidTokenManagerTokenAccount)]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,

    // issuer
    #[account(mut, constraint = token_manager.issuer == issuer.key() @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
    #[account(mut, constraint = issuer_token_account.owner == issuer.key() @ ErrorCode::InvalidIssuerTokenAccount)]
    issuer_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, UnissueCtx<'info>>) -> Result<()> {
    let remaining_accs = &mut ctx.remaining_accounts.iter();
    let token_manager = &mut ctx.accounts.token_manager;

    // get PDA seeds to sign with
    let mint = token_manager.mint;
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    if token_manager.kind == TokenManagerKind::Edition as u8 {
        let edition_info = next_account_info(remaining_accs)?;
        match assert_derivation(
            &mpl_token_metadata::id(),
            &edition_info.to_account_info(),
            &[mpl_token_metadata::state::PREFIX.as_bytes(), mpl_token_metadata::id().as_ref(), mint.as_ref()],
        ) {
            // migrated pnft
            Ok(_) => {
                let mint_metadata_data = edition_info.try_borrow_mut_data().expect("Failed to borrow data");
                let metadata = Metadata::deserialize(&mut mint_metadata_data.as_ref()).expect("Failed to deserialize metadata");
                match metadata.token_standard {
                    Some(TokenStandard::ProgrammableNonFungible) => {
                        token_manager.kind = TokenManagerKind::Programmable as u8;
                    }
                    _ => return Err(error!(ErrorCode::InvalidTokenManagerKind)),
                }
            }
            // regular edition
            _ => {}
        }
    }

    match token_manager.kind {
        k if k == TokenManagerKind::Programmable as u8 => {
            let system_program_info = next_account_info(remaining_accs)?;
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
                        // #[account(0, writable, name="token", desc="Token account")]
                        AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                        // #[account(1, name="token_owner", desc="Token account owner")]
                        AccountMeta::new_readonly(token_manager.key(), false),
                        // #[account(2, writable, name="destination", desc="Destination token account")]
                        AccountMeta::new(ctx.accounts.issuer_token_account.key(), false),
                        // #[account(3, name="destination_owner", desc="Destination token account owner")]
                        AccountMeta::new_readonly(ctx.accounts.issuer.key(), false),
                        // #[account(4, name="mint", desc="Mint of token asset")]
                        AccountMeta::new_readonly(mint_info.key(), false),
                        // #[account(5, writable, name="metadata", desc="Metadata (pda of ['metadata', program id, mint id])")]
                        AccountMeta::new(mint_metadata_info.key(), false),
                        // #[account(6, optional, name="edition", desc="Edition of token asset")]
                        AccountMeta::new_readonly(mint_edition_info.key(), false),
                        // #[account(7, optional, writable, name="recipient_token_record", desc="Owner token record account")]
                        AccountMeta::new(from_token_record.key(), false),
                        // #[account(8, optional, writable, name="destination_token_record", desc="Destination token record account")]
                        AccountMeta::new(to_token_record.key(), false),
                        // #[account(9, signer, name="authority", desc="Transfer authority (token owner or delegate)")]
                        AccountMeta::new_readonly(token_manager.key(), true),
                        // #[account(10, signer, writable, name="payer", desc="Payer")]
                        AccountMeta::new(ctx.accounts.issuer.key(), true),
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
                        amount: token_manager.amount,
                        authorization_data: None,
                    })
                    .try_to_vec()
                    .unwrap(),
                },
                &[
                    ctx.accounts.token_manager_token_account.to_account_info(),
                    token_manager.to_account_info(),
                    ctx.accounts.issuer_token_account.to_account_info(),
                    ctx.accounts.issuer.to_account_info(),
                    mint_info.to_account_info(),
                    mint_metadata_info.to_account_info(),
                    mint_edition_info.to_account_info(),
                    from_token_record.to_account_info(),
                    to_token_record.to_account_info(),
                    ctx.accounts.issuer.to_account_info(),
                    system_program_info.to_account_info(),
                    sysvar_instructions_info.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    associated_token_program_info.to_account_info(),
                    authorization_rules_program_info.to_account_info(),
                    authorization_rules_info.to_account_info(),
                ],
                token_manager_signer,
            )?;

            // close token account
            let cpi_accounts = CloseAccount {
                account: ctx.accounts.token_manager_token_account.to_account_info(),
                destination: ctx.accounts.issuer.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::close_account(cpi_context)?;

            // close token manager account
            token_manager.close(ctx.accounts.issuer.to_account_info())?;
        }
        _ => {
            // transfer amount to destination token account
            let cpi_accounts = Transfer {
                from: ctx.accounts.token_manager_token_account.to_account_info(),
                to: ctx.accounts.issuer_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;

            // close token account
            let cpi_accounts = CloseAccount {
                account: ctx.accounts.token_manager_token_account.to_account_info(),
                destination: ctx.accounts.issuer.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::close_account(cpi_context)?;

            // close token manager account
            token_manager.close(ctx.accounts.issuer.to_account_info())?;
        }
    }

    Ok(())
}
