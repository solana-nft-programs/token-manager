pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz");

#[program]
pub mod cardinal_token_manager {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, seed: Vec<u8>, bump: u8, num_invalidators: u8) -> ProgramResult {
        init::handler(ctx, seed, bump, num_invalidators)
    }

    pub fn set_payment_manager(ctx: Context<SetPaymentManagerCtx>, payment_manager: Pubkey) -> ProgramResult {
        set_payment_manager::handler(ctx, payment_manager)
    }

    pub fn set_claim_approver(ctx: Context<SetClaimAuthorityCtx>, claim_approver: Pubkey) -> ProgramResult {
        set_claim_approver::handler(ctx, claim_approver)
    }

    pub fn set_transfer_authority(ctx: Context<SetTransferAuthorityCtx>, transfer_authority: Pubkey) -> ProgramResult {
        set_transfer_authority::handler(ctx, transfer_authority)
    }

    pub fn add_invalidator(ctx: Context<AddInvalidatorCtx>, invalidator: Pubkey) -> ProgramResult {
        add_invalidator::handler(ctx, invalidator)
    }

    pub fn create_claim_receipt(ctx: Context<CreateClaimReceiptCtx>, bump: u8, target: Pubkey) -> ProgramResult {
        create_claim_receipt::handler(ctx, bump, target)
    }

    pub fn create_transfer_receipt(ctx: Context<CreateTransferReceiptCtx>, bump: u8, target: Pubkey) -> ProgramResult {
        create_transfer_receipt::handler(ctx, bump, target)
    }

    pub fn issue(ctx: Context<IssueCtx>, ix: IssueIx) -> ProgramResult {
        issue::handler(ctx, ix)
    }

    pub fn unissue(ctx: Context<UnissueCtx>) -> ProgramResult {
        unissue::handler(ctx)
    }

    pub fn claim(ctx: Context<ClaimCtx>) -> ProgramResult {
        claim::handler(ctx)
    }

    pub fn invalidate(ctx: Context<InvalidateCtx>) -> ProgramResult {
        invalidate::handler(ctx)
    }
}