use mpl_token_metadata::instruction::MetadataInstruction;
use mpl_token_metadata::instruction::TransferArgs;
use solana_program::instruction::Instruction;

use crate::errors::ErrorCode;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::token::Token;
use anchor_spl::token::TokenAccount;
use anchor_spl::token::Transfer;
use anchor_spl::token::{self};
use solana_program::program::invoke;
use solana_program::system_instruction;

#[derive(Accounts)]
pub struct IssueCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Initialized as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint = token_manager_token_account.owner == token_manager.key() @ ErrorCode::InvalidTokenManagerTokenAccount)]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,

    // issuer
    #[account(constraint = issuer.key() == token_manager.issuer @ ErrorCode::InvalidIssuer)]
    issuer: Signer<'info>,
    #[account(mut, constraint = issuer_token_account.mint == token_manager.mint && issuer_token_account.owner == issuer.key() @ ErrorCode::InvalidIssuerTokenAccount)]
    issuer_token_account: Box<Account<'info, TokenAccount>>,

    // other
    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, IssueCtx<'info>>) -> Result<()> {
    // set token manager data
    let token_manager = &mut ctx.accounts.token_manager;

    // Claim approver must be set to use vesting invalidation type
    if token_manager.invalidation_type == InvalidationType::Vest as u8 && token_manager.claim_approver.is_none() {
        return Err(error!(ErrorCode::ClaimApproverMustBeSet));
    }
    if token_manager.kind == TokenManagerKind::Permissioned as u8 && token_manager.invalidation_type != InvalidationType::Release as u8 {
        return Err(error!(ErrorCode::InvalidInvalidationTypeKindMatch));
    }

    let remaining_accs = &mut ctx.remaining_accounts.iter();
    if token_manager.kind == TokenManagerKind::Permissioned as u8 {
        let permisisoned_reward_info = next_account_info(remaining_accs)?;
        if permisisoned_reward_info.key().to_string() != PERMISSIONED_REWARD_ADDRESS {
            return Err(error!(ErrorCode::InvalidPermissionedRewardAddress));
        }
        invoke(
            &system_instruction::transfer(&ctx.accounts.issuer.key(), &permisisoned_reward_info.key(), PERMISSIONED_REWARD_LAMPORTS),
            &[
                ctx.accounts.issuer.to_account_info(),
                permisisoned_reward_info.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    token_manager.issuer = ctx.accounts.issuer.key();
    token_manager.recipient_token_account = ctx.accounts.token_manager_token_account.key();
    token_manager.state = TokenManagerState::Issued as u8;
    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;

    match token_manager.kind {
        k if k == TokenManagerKind::Programmable as u8 => {
            let mint_info = next_account_info(remaining_accs)?;
            let mint_metadata_info = next_account_info(remaining_accs)?;
            let mint_edition_info = next_account_info(remaining_accs)?;
            let issuer_token_record_info = next_account_info(remaining_accs)?;
            let token_manager_token_record_info = next_account_info(remaining_accs)?;
            let sysvar_instructions_info = next_account_info(remaining_accs)?;
            let associated_token_program_info = next_account_info(remaining_accs)?;
            let authorization_rules_program_info = next_account_info(remaining_accs)?;
            let authorization_rules_info = next_account_info(remaining_accs)?;
            let accounts = vec![
                AccountMeta::new(ctx.accounts.issuer_token_account.key(), false),
                AccountMeta::new_readonly(ctx.accounts.issuer_token_account.owner.key(), false),
                AccountMeta::new(ctx.accounts.token_manager_token_account.key(), false),
                AccountMeta::new_readonly(token_manager.key(), false),
                AccountMeta::new_readonly(mint_info.key(), false),
                AccountMeta::new(mint_metadata_info.key(), false),
                AccountMeta::new_readonly(mint_edition_info.key(), false),
                AccountMeta::new(issuer_token_record_info.key(), false),
                AccountMeta::new(token_manager_token_record_info.key(), false),
                AccountMeta::new_readonly(ctx.accounts.issuer.key(), true),
                AccountMeta::new(ctx.accounts.payer.key(), true),
                AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
                AccountMeta::new_readonly(sysvar_instructions_info.key(), false),
                AccountMeta::new_readonly(ctx.accounts.token_program.key(), false),
                AccountMeta::new_readonly(associated_token_program_info.key(), false),
                AccountMeta::new_readonly(authorization_rules_program_info.key(), false),
                AccountMeta::new_readonly(authorization_rules_info.key(), false),
            ];
            invoke(
                &Instruction {
                    program_id: mpl_token_metadata::id(),
                    accounts,
                    data: MetadataInstruction::Transfer(TransferArgs::V1 {
                        amount: token_manager.amount,
                        authorization_data: None,
                    })
                    .try_to_vec()
                    .unwrap(),
                },
                &[
                    ctx.accounts.issuer_token_account.to_account_info(),
                    ctx.accounts.issuer.to_account_info(),
                    ctx.accounts.token_manager_token_account.to_account_info(),
                    ctx.accounts.token_manager.to_account_info(),
                    mint_info.to_account_info(),
                    mint_metadata_info.to_account_info(),
                    mint_edition_info.to_account_info(),
                    issuer_token_record_info.to_account_info(),
                    token_manager_token_record_info.to_account_info(),
                    ctx.accounts.issuer.to_account_info(),
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    sysvar_instructions_info.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    associated_token_program_info.to_account_info(),
                    authorization_rules_program_info.to_account_info(),
                    authorization_rules_info.to_account_info(),
                ],
            )?;
        }
        _ => {
            // transfer token to token manager token account
            let cpi_accounts = Transfer {
                from: ctx.accounts.issuer_token_account.to_account_info(),
                to: ctx.accounts.token_manager_token_account.to_account_info(),
                authority: ctx.accounts.issuer.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
            token::transfer(cpi_context, token_manager.amount)?;
        }
    }

    Ok(())
}
