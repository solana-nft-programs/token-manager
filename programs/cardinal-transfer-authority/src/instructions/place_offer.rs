use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    cardinal_token_manager::state::{TokenManager, TokenManagerState},
};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct MakeOfferIx {
    pub payment_amount: u64,
    pub payment_mint: Pubkey,
    pub marketplace: Pubkey,
}

#[derive(Accounts)]
#[instruction(ix: MakeOfferIx)]
pub struct MakeOfferCtx<'info> {
    #[account(
        init,
        payer = payer,
        space = OFFER_SIZE,
        seeds = [OFFER_SEED.as_bytes(), token_manager.key().as_ref(), offerer.key().as_ref()], bump,
    )]
    offer: Box<Account<'info, Offer>>,

    #[account(constraint = token_manager.state == TokenManagerState::Claimed as u8 @ ErrorCode::InvalidTokenManager)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    offerer: Signer<'info>,
    #[account(constraint =
        offerer_token_account.mint == ix.payment_mint &&
        offerer_token_account.amount == ix.payment_amount &&
        offerer_token_account.owner == offerer.key() @ ErrorCode::InvalidOffererTokenAccount)]
    offerer_token_account: Box<Account<'info, TokenAccount>>,
    #[account(constraint =
        offer_token_account.mint == ix.payment_mint &&
        offer_token_account.owner == offerer.key() @ ErrorCode::InvalidOfferTokenAccount)]
    offer_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MakeOfferCtx>, ix: MakeOfferIx) -> Result<()> {
    let offer = &mut ctx.accounts.offer;
    offer.bump = *ctx.bumps.get("offer").unwrap();
    offer.offerer = ctx.accounts.offerer.key();
    offer.token_manager = ctx.accounts.token_manager.key();
    offer.marketplace = ix.marketplace.key();
    // payment
    offer.payment_amount = ix.payment_amount;
    offer.payment_mint = ix.payment_mint;

    if ix.payment_amount > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.offerer_token_account.to_account_info(),
            to: ctx.accounts.offer_token_account.to_account_info(),
            authority: ctx.accounts.offerer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, ix.payment_amount)?;
    }

    Ok(())
}
