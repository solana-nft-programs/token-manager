use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::AccountsClose;
use anchor_spl::token::CloseAccount;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};
use mpl_token_metadata::accounts::Metadata;
use mpl_token_metadata::instructions::TransferV1;
use mpl_token_metadata::instructions::TransferV1InstructionArgs;
use mpl_token_metadata::types::TokenStandard;
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
    let remaining_accs = &mut ctx.remaining_accounts.iter().peekable();
    let token_manager = &mut ctx.accounts.token_manager;

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
                &TransferV1 {
                    token: ctx.accounts.token_manager_token_account.key(),
                    token_owner: token_manager.key(),
                    destination_token: ctx.accounts.issuer_token_account.key(),
                    destination_owner: ctx.accounts.issuer.key(),
                    mint: mint_info.key(),
                    metadata: mint_metadata_info.key(),
                    edition: Some(mint_edition_info.key()),
                    token_record: Some(from_token_record.key()),
                    destination_token_record: Some(to_token_record.key()),
                    authority: token_manager.key(),
                    payer: ctx.accounts.issuer.key(),
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
