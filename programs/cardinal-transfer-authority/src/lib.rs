pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR");

#[program]
pub mod cardinal_paid_transfer_authority {
    use super::*;

    pub fn init(ctx: Context<InitTransferAuthorityCtx>, ix: InitTransferAuthorityIx) -> Result<()> {
        init_transfer_authority::handler(ctx, ix)
    }
}
