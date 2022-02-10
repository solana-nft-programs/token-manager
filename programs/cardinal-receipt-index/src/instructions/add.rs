use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    cardinal_token_manager::{state::{TokenManager}},
};

#[derive(Accounts)]
#[instruction(issuer: Pubkey, receipt_slot_bump: u8, receipt_marker_bump: u8, slot_num: u64)]
pub struct AddCtx<'info> {
    #[account(constraint = issuer == token_manager.issuer @ ErrorCode::SlotNumberTooLarge)]
    token_manager: Box<Account<'info, TokenManager>>,

    #[account(mut)]
    receipt_counter: Box<Account<'info, ReceiptCounter>>,

    #[account(
        init,
        payer = payer,
        space = RECEIPT_SLOT_SIZE,
        seeds = [RECEIPT_SLOT_SEED.as_bytes(), issuer.as_ref(), slot_num.to_le_bytes().as_ref()], bump = receipt_slot_bump,
        constraint = slot_num <= receipt_counter.count + 1 @ ErrorCode::SlotNumberTooLarge
    )]
    receipt_slot: Box<Account<'info, ReceiptSlot>>,

    #[account(
        init_if_needed,
        payer = payer,
        space = RECEIPT_MARKER_SIZE,
        seeds = [RECEIPT_MARKER_SEED.as_bytes(), token_manager.key().as_ref()], bump = receipt_marker_bump,
    )]
    receipt_marker: Box<Account<'info, ReceiptMarker>>,

    #[account(mut, constraint = payer.key() == issuer @ ErrorCode::InvalidIssuer)]
    payer: Signer<'info>,
    system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<AddCtx>, _issuer: Pubkey, _receipt_slot_bump: u8, receipt_marker_bump: u8, slot_num: u64) -> ProgramResult {
    let receipt_counter = &mut ctx.accounts.receipt_counter;
    if slot_num > receipt_counter.count {
        receipt_counter.count = slot_num;
    }

    let receipt_slot = &mut ctx.accounts.receipt_slot;
    receipt_slot.token_manager = ctx.accounts.token_manager.key();

    let receipt_marker = &mut ctx.accounts.receipt_marker;
    receipt_marker.bump = receipt_marker_bump;

    // Right now the marker is using init_if_needed so that it can be added in one instruction in the scenario where someone is trying to
    // add a token_manager to the index but the old one was never invalidated. This could be avoided by first closing the old receipt_marker
    // but close and init cannot happen in one transaction with anchor currently until solana 1.9
    // Also of note - because of this limitation it is possible to take arbitrarily many slots for the same token_manager because this init_if_needed
    // will still let it through. We are enforcing that the issuer is the signer so they can only do this to themselves
    if ctx.accounts.receipt_marker.receipt_manager != None {
        return Err(ErrorCode::MustInvalidateReceipt.into())
    }
    return Ok(())
}