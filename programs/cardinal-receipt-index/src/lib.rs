pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("rcpCr9GVsP2CPmS11uuFXUXbzc5JJQFMDvDRn8JDQNh");

#[program]
pub mod cardinal_receipt_index {
    use super::*;

    pub fn init(ctx: Context<InitCtx>, issuer: Pubkey, bump: u8) -> ProgramResult {
        init::handler(ctx, issuer, bump)
    }

    pub fn add(ctx: Context<AddCtx>, issuer: Pubkey, receipt_slot_bump: u8, receipt_marker_bump: u8, slot_num: u64) -> ProgramResult {
        add::handler(ctx, issuer, receipt_slot_bump, receipt_marker_bump, slot_num)
    }

    pub fn claim(ctx: Context<ClaimCtx>, receipt_token_manager_bump: u8, name: String) -> ProgramResult {
        claim::handler(ctx, receipt_token_manager_bump, name)
    }

    pub fn invalidate<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> ProgramResult {
        invalidate::handler(ctx)
    }

    pub fn remove(ctx: Context<RemoveCtx>) -> ProgramResult {
        remove::handler(ctx)
    }
}