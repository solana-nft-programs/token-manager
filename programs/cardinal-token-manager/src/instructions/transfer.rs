use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*, solana_program::program::invoke_signed, AccountsClose},
    anchor_spl::{token::{self, Token, TokenAccount, Mint, Transfer, FreezeAccount, ThawAccount, Approve}},
    mpl_token_metadata::{instruction::{freeze_delegated_account, thaw_delegated_account}, utils::assert_derivation},
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
        recipient_token_account.key() == token_manager.recipient_token_account
        @ ErrorCode::InvalidCurrentTokenAccount
    )]
    current_holder_token_account: Box<Account<'info, TokenAccount>>,

    // new recipient
    #[account(mut)]
    recipient: Signer<'info>,
    #[account(mut, constraint =
        recipient_token_account.owner == recipient.key()
        && recipient_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidRecipientTokenAccount
    )]
    recipient_token_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, TransferCtx<'info>>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    token_manager.recipient_token_account = ctx.accounts.recipient_token_account.key();

    let remaining_accs = &mut ctx.remaining_accounts.iter();
        
    // get PDA seeds to sign with
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), token_manager.mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    // if this is a managed token, this means we will revoke it at the end of life, so we need to delegate and freeze
    if token_manager.kind == TokenManagerKind::Managed as u8 {
        let mint_manager_info = next_account_info(remaining_accs)?;
        let mint = ctx.accounts.mint.key();
        let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
        let bump_seed = assert_derivation(ctx.program_id, mint_manager_info, path)?;
        let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[bump_seed]];
        let mint_manager_signer = &[&mint_manager_seeds[..]];

        // thaw recipient account
        let cpi_accounts = ThawAccount {
            account: ctx.accounts.current_holder_token_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            authority: mint_manager_info.clone(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
        token::thaw_account(cpi_context)?;
                
        // transfer amount to recipient token account
        let cpi_accounts = Transfer {
            from: ctx.accounts.current_holder_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::transfer(cpi_context, token_manager.amount)?;

        // set account delegate of recipient token account to token manager PDA
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
            authority: mint_manager_info.clone(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
        token::freeze_account(cpi_context)?;
    } else if token_manager.kind == TokenManagerKind::Edition as u8 {
        let remaining_accs = &mut ctx.remaining_accounts.iter();
        let current_edition_info = next_account_info(remaining_accs)?;
        let edition_info = next_account_info(remaining_accs)?;
        let metadata_program = next_account_info(remaining_accs)?;

        // edition will be validated by metadata_program
        if metadata_program.key() != mpl_token_metadata::id() { return Err(error!(ErrorCode::PublicKeyMismatch)); }

        invoke_signed(
            &thaw_delegated_account(
                *metadata_program.key,
                token_manager.key(),
                ctx.accounts.current_holder_token_account.key(),
                *current_edition_info.key,
                ctx.accounts.mint.key(),
            ),
            &[token_manager.to_account_info(),
                ctx.accounts.current_holder_token_account.to_account_info(),
                current_edition_info.to_account_info(),
                ctx.accounts.mint.to_account_info()],
            &[token_manager_seeds],
        )?;

        // transfer amount to recipient token account
        let cpi_accounts = Transfer {
            from: ctx.accounts.current_holder_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::transfer(cpi_context, token_manager.amount)?;

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
            &[token_manager.to_account_info(),
                ctx.accounts.recipient_token_account.to_account_info(),
                edition_info.to_account_info(),
                ctx.accounts.mint.to_account_info()],
            &[token_manager_seeds],
        )?;
    }

    // verify transfer receipt
    if token_manager.transfer_authority != None {
        let transfer_receipt_info = next_account_info(remaining_accs)?;
        let transfer_receipt = Account::<TranferReceipt>::try_from(transfer_receipt_info)?;
        if transfer_receipt.mint_count != token_manager.count { return Err(error!(ErrorCode::InvalidTransferReceipt)); }
        if transfer_receipt.token_manager != token_manager.key() { return Err(error!(ErrorCode::InvalidTransferReceipt)); }
        if transfer_receipt.target != ctx.accounts.recipient.key() { return Err(error!(ErrorCode::InvalidTransferReceipt)); }
        transfer_receipt.close(ctx.accounts.recipient.to_account_info())?;
    }
    Ok(())
}
