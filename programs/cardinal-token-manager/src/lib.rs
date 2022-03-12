pub mod instructions;
pub mod state;
pub mod utils;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM");

#[program]
pub mod cardinal_token_manager {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, mint: Pubkey, num_invalidators: u8) -> Result<()> {
        init::handler(ctx, mint, num_invalidators)
    }

    pub fn uninit(ctx: Context<UninitCtx>) -> Result<()> {
        uninit::handler(ctx)
    }

    pub fn init_mint_counter(ctx: Context<InitMintCounterCtx>, mint: Pubkey) -> Result<()> {
        init_mint_counter::handler(ctx, mint)
    }

    pub fn set_claim_approver(ctx: Context<SetClaimApproverCtx>, claim_approver: Pubkey) -> Result<()> {
        set_claim_approver::handler(ctx, claim_approver)
    }

    pub fn set_transfer_authority(ctx: Context<SetTransferAuthorityCtx>, transfer_authority: Pubkey) -> Result<()> {
        set_transfer_authority::handler(ctx, transfer_authority)
    }

    pub fn add_invalidator(ctx: Context<AddInvalidatorCtx>, invalidator: Pubkey) -> Result<()> {
        add_invalidator::handler(ctx, invalidator)
    }

    pub fn create_claim_receipt(ctx: Context<CreateClaimReceiptCtx>, target: Pubkey) -> Result<()> {
        create_claim_receipt::handler(ctx, target)
    }

    pub fn create_transfer_receipt(ctx: Context<CreateTransferReceiptCtx>, target: Pubkey) -> Result<()> {
        create_transfer_receipt::handler(ctx, target)
    }

    pub fn claim_receipt_mint(ctx: Context<ClaimReceiptMintCtx>, name: String) -> Result<()> {
        claim_receipt_mint::handler(ctx, name)
    }

    pub fn issue(ctx: Context<IssueCtx>, ix: IssueIx) -> Result<()> {
        issue::handler(ctx, ix)
    }

    pub fn unissue(ctx: Context<UnissueCtx>) -> Result<()> {
        unissue::handler(ctx)
    }

    pub fn claim<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, ClaimCtx<'info>>) -> Result<()> {
        claim::handler(ctx)
    }

    pub fn transfer<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, TransferCtx<'info>>) -> Result<()> {
        transfer::handler(ctx)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
        invalidate::handler(ctx)
    }

    pub fn create_mint_manager(ctx: Context<CreateMintManagerCtx>) -> Result<()> {
        create_mint_manager::handler(ctx)
    }

    pub fn close_mint_manager(ctx: Context<CloseMintManagerCtx>) -> Result<()> {
        close_mint_manager::handler(ctx)
    }
}