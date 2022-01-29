pub mod instructions;
pub mod state;
pub mod errors;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("crt4Ymiqtk3M5w6JuKDT7GuZfUDiPLnhwRVqymSSBBn");

#[program]
pub mod cardinal_token_manager {
    use super::*;

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