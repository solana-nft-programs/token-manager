use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*},
    anchor_spl::{token::{self, Token, TokenAccount, Mint, Transfer, FreezeAccount, Approve}}
};

#[derive(Accounts)]
pub struct TransferCtx<'info> {
    #[account(mut, constraint =
        token_manager.state == TokenManagerState::Claimed as u8
    )]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint =
        token_manager_token_account.owner == token_manager.key()
        && token_manager_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidTokenManagerTokenAccount
    )]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,

    // current
    #[account(mut, constraint =
        && recipient_token_account.key() == token_manager.recipient_token_account
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    current_holder_token_account: Box<Account<'info, TokenAccount>>,

    // new recipient
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

pub fn handler(ctx: Context<TransferCtx>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.recipient_token_account = ctx.accounts.recipient_token_account.key();

    let remaining_accs = &mut ctx.remaining_accounts.iter();
        
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
        // set account delegate of recipient token account to token manager PDA
        let cpi_accounts = Approve {
            to: ctx.accounts.recipient_token_account.to_account_info(),
            delegate: token_manager.to_account_info(),
            authority: ctx.accounts.recipient.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::approve(cpi_context, token_manager.amount)?;
        
        let mint_manager_info = next_account_info(remaining_accs)?;
        let mint = ctx.accounts.mint.key();
        let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
        let bump_seed = assert_derivation(ctx.program_id, mint_manager_info, path)?;
        let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[bump_seed]];
        let mint_manager_signer = &[&mint_manager_seeds[..]];
        
        // freeze recipient token account
        let cpi_accounts = FreezeAccount {
            account: ctx.accounts.recipient_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: mint_manager_info.clone(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
        token::freeze_account(cpi_context)?;
    } else if token_manager.kind == TokenManagerKind::Edition as u8 {
        let remaining_accs = &mut ctx.remaining_accounts.iter();
        let edition_info = next_account_info(remaining_accs)?;
        let metadata_program = next_account_info(remaining_accs)?;

        // edition will be validated by metadata_program
        assert_keys_eq!(metadata_program.key, mpl_token_metadata::id());

        // set account delegate of recipient token account to token manager PDA
        let cpi_accounts = Approve {
            to: ctx.accounts.recipient_token_account.to_account_info(),
            delegate: token_manager.to_account_info(),
            authority: ctx.accounts.recipient.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::approve(cpi_context, token_manager.amount)?;
        
        invoke_signed(
            &freeze_delegated_account(
                *metadata_program.key,
                token_manager.key(),
                ctx.accounts.recipient_token_account.key(),
                *edition_info.key,
                ctx.accounts.mint.key(),
            ),
            &vec![
                token_manager.to_account_info(),
                ctx.accounts.recipient_token_account.to_account_info(),
                edition_info.to_account_info(),
                ctx.accounts.mint.to_account_info(),
            ],
            &[token_manager_seeds],
        )?;
    }

    // verify transfer receipt
    if token_manager.transfer_authority != None {
        let transfer_receipt_info = next_account_info(remaining_accs)?;
        let token_manager_key = token_manager.key();
        let recipient_key = ctx.accounts.recipient.key();
        let seed = &[
            TRANSFER_RECEIPT_SEED.as_ref(),
            token_manager_key.as_ref(),
            recipient_key.as_ref(),
        ];
        let (transfer_receipt_address, _bump) = Pubkey::find_program_address(seed, ctx.program_id);
        assert_keys_eq!(transfer_receipt_address, transfer_receipt_info.key());
        let transfer_receipt = Account::<TranferReceipt>::try_from(transfer_receipt_info)?;
        transfer_receipt.close(ctx.accounts.recipient.to_account_info())?;
    }
    return Ok(())
}
