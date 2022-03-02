use {
    crate::{state::*},
    anchor_lang::{prelude::*, AccountsClose},
    cardinal_token_manager::{state::{TokenManager, TokenManagerState, InvalidationType}},
};

#[derive(Accounts)]
pub struct CloseCtx<'info> {
    token_manager: UncheckedAccount<'info>,

    #[account(
        mut,
        // seeds = [PAID_CLAIM_APPROVER_SEED.as_bytes(), token_manager.key().as_ref()], bump = claim_approver.bump,
    )]
    claim_approver: Box<Account<'info, PaidClaimApprover>>,

    #[account(mut)]
    closer: Signer<'info>,
}

pub fn handler(ctx: Context<CloseCtx>) -> ProgramResult {
    ctx.accounts.claim_approver.close(ctx.accounts.closer.to_account_info())?;

    // if ctx.accounts.token_manager.data_is_empty() {
    // } else {
    //     let token_manager = Account::<TokenManager>::try_from(&ctx.accounts.token_manager)?;
    //     if token_manager.state == TokenManagerState::Initialized as u8 && ctx.accounts.closer.key() == token_manager.issuer {
    //         ctx.accounts.claim_approver.close(ctx.accounts.closer.to_account_info())?;
    //     }
    //     if token_manager.state != TokenManagerState::Issued as u8 {
    //         ctx.accounts.claim_approver.close(ctx.accounts.closer.to_account_info())?;
    //     }
    // }
    return Ok(())
}