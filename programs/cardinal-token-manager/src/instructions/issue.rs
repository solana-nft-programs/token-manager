use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Token, TokenAccount, Transfer},
    solana_program::{program::invoke, system_instruction::transfer},
};

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

    if token_manager.kind == TokenManagerKind::Permissioned as u8 {
        let remaining_accs = &mut ctx.remaining_accounts.iter();
        let permisisoned_reward_info = next_account_info(remaining_accs)?;
        if permisisoned_reward_info.key().to_string() != PERMISSIONED_REWARD_ADDRESS {
            return Err(error!(ErrorCode::InvalidPermissionedRewardAddress));
        }
        invoke(
            &transfer(&ctx.accounts.issuer.key(), &permisisoned_reward_info.key(), PERMISSIONED_REWARD_LAMPORTS),
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

    // transfer token to token manager token account
    let cpi_accounts = Transfer {
        from: ctx.accounts.issuer_token_account.to_account_info(),
        to: ctx.accounts.token_manager_token_account.to_account_info(),
        authority: ctx.accounts.issuer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, token_manager.amount)?;
    Ok(())
}
