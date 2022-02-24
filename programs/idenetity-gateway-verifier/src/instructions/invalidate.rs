use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use solana_gateway::error::GatewayError;
use solana_gateway::VerificationOptions;
use cardinal_token_manager::program::CardinalTokenManager;
use cardinal_token_manager::state::TokenManager;
use crate::state::*;
use crate::errors::*;
use crate::errors::Error::ErrorCode;

pub struct Invalidate<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut)]
    gateway_validator: Box<Account<'info, GatewayValidator>>,
    #[owner = ]
    gateway_token: UncheckedAccount<'info>,
    #[account(mut)]
    invalidator: Signer<'info>,
    cardinal_token_manager: Program<'info, CardinalTokenManager>,
    token_program: UncheckedAccount<'info>,

    // cpi accounts
    #[account(mut)]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    mint: UncheckedAccount<'info>,
    #[account(mut)]
    recipient_token_account: UncheckedAccount<'info>,
}

pub fn invalidate(ctx: Context<Invalidate>) -> ProgramResult{
    if solana_gateway::Gateway::verify_gateway_token_account_info(
        &ctx.accounts.gateway_token.to_account_info(),
        &ctx.accounts.token_manager_token_account.owner,
        &ctx.accounts.gateway_validator.network,
        Some(VerificationOptions{
            check_expiry: false,
            expiry_tolerance_seconds: None
        }),
    ) != Err(GatewayError::TokenRevoked) {
        Err(ErrorCode::NonRevokedToken.into())
    } else {
        let token_manager_key = ctx.accounts.token_manager.key();
        let gateway_validator_seeds = &[GATEWAY_VALIDATOR_SEED, token_manager_key.as_ref(), &[ctx.accounts.gateway_validator.bump]];
        let gateway_validator_signer: &[&[&[u8]]] = &[&gateway_validator_seeds];

        let cpi_accounts = cardinal_token_manager::cpi::accounts::InvalidateCtx{
            token_manager: ctx.accounts.token_manager.to_account_info(),
            token_manager_token_account: ctx.accounts.token_manager_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            recipient_token_account: ctx.accounts.recipient_token_account.to_account_info(),
            invalidator: ctx.accounts.gateway_validator.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.cardinal_token_manager.to_account_info(), cpi_accounts)
            .with_remaining_accounts(ctx.remaining_accounts.to_vec())
            .with_signer(gateway_validator_signer);
        cardinal_token_manager::cpi::invalidate(cpi_ctx)?;

        Ok(())
    }
}
