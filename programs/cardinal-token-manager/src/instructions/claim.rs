use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{self, Token, TokenAccount, Mint, Transfer, FreezeAccount, Approve}},
    vipers::assert_keys_eq
};

#[derive(Accounts)]
pub struct ClaimCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Issued as u8 @ ErrorCode::InvalidTokenManagerState)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint =
        token_manager_token_account.owner == token_manager.key()
        && token_manager_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidTokenManagerTokenAccount
    )]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,

    // recipient
    #[account(mut)]
    recipient: Signer<'info>,
    #[account(mut, constraint =
        recipient_token_account.owner == recipient.key()
        && recipient_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    recipient_token_account: Box<Account<'info, TokenAccount>>,
    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimCtx>) -> ProgramResult {
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.recipient_token_account = ctx.accounts.recipient_token_account.key();
    token_manager.state = TokenManagerState::Claimed as u8;

    // verify claim receipt
    if token_manager.claim_approver != None {
        let remaining_accs = &mut ctx.remaining_accounts.iter();
        let claim_receipt_info = next_account_info(remaining_accs)?;
        let token_manager_key = token_manager.key();
        let recipient_key = ctx.accounts.recipient.key();
        let seed = &[
            CLAIM_RECEIPT_SEED.as_ref(),
            token_manager_key.as_ref(),
            recipient_key.as_ref(),
        ];
        let (claim_receipt_address, _bump) = Pubkey::find_program_address(seed, ctx.program_id);
        assert_keys_eq!(claim_receipt_address, claim_receipt_info.key());
        Account::<ClaimReceipt>::try_from(claim_receipt_info)?;
    }

    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), token_manager.mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // transfer amount to recipient token account
    let cpi_accounts = Transfer {
        from: ctx.accounts.token_manager_token_account.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::transfer(cpi_context, token_manager.amount)?;

    // if this is a managed token, this means we will revoke it at the end of life, so we need to delegate and freeze
    if token_manager.kind == TokenManagerKind::Managed as u8 {
        // set account delegate of recipient token account to certificate PDA
        let cpi_accounts = Approve {
            to: ctx.accounts.recipient_token_account.to_account_info(),
            delegate: token_manager.to_account_info(),
            authority: ctx.accounts.recipient.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::approve(cpi_context, token_manager.amount)?;
        
        // freeze recipient token account
        let cpi_accounts = FreezeAccount {
            account: ctx.accounts.recipient_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::freeze_account(cpi_context)?;
    }
    return Ok(())
}
