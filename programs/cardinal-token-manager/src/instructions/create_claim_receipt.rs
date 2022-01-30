use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
};

#[derive(Accounts)]
#[instruction(bump: u8, target: Pubkey)]
pub struct CreateClaimReceiptCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut, constraint =
        token_manager.claim_authority != None
        && token_manager.claim_authority.unwrap() == claim_authority.key()
        @ ErrorCode::InvalidIssuer
    )]
    claim_authority: Signer<'info>,

    #[account(
        init,
        payer = claim_authority,
        seeds = [CLAIM_RECEIPT_SEED.as_bytes(), token_manager.key().as_ref(), target.key().as_ref()], bump = bump,
        space = CLAIM_RECEIPT_SIZE,
    )]
    claim_receipt: Box<Account<'info, ClaimReceipt>>,
    system_program: Program<'info, System>,
}

pub fn handler(_ctx: Context<CreateClaimReceiptCtx>, _bump: u8, _target: Pubkey) -> ProgramResult {
    return Ok(())
}