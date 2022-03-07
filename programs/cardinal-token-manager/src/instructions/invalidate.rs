use {
    crate::{state::*, errors::ErrorCode},
    anchor_lang::{prelude::*, solana_program::program::invoke_signed, AccountsClose},
    anchor_spl::{token::{self, Token, TokenAccount, Mint, Transfer, ThawAccount, CloseAccount}},
    mpl_token_metadata::{instruction::thaw_delegated_account, utils::{assert_derivation, assert_initialized}},
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut)]
    token_manager: Box<Account<'info, TokenManager>>,
    #[account(mut, constraint =
        token_manager_token_account.owner == token_manager.key()
        && token_manager_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidTokenManagerTokenAccount
    )]
    token_manager_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = mint.key() == token_manager.mint @ ErrorCode::InvalidMint)]
    mint: Box<Account<'info, Mint>>,

    // recipient
    #[account(mut)]
    recipient_token_account: Box<Account<'info, TokenAccount>>,

    // invalidator
    #[account(constraint = token_manager.invalidators.contains(&invalidator.key()) @ ErrorCode::InvalidInvalidator)]
    invalidator: Signer<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    collector: AccountInfo<'info>,

    token_program: Program<'info, Token>,
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, InvalidateCtx<'info>>) -> Result<()> {
    let token_manager = &mut ctx.accounts.token_manager;
    let remaining_accs = &mut ctx.remaining_accounts.iter();

    // get PDA seeds to sign with
    let mint = token_manager.mint;
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    if token_manager.state == TokenManagerState::Claimed as u8 {
        if token_manager.kind == TokenManagerKind::Managed as u8 {
            let mint_manager_info = next_account_info(remaining_accs)?;
            let mut mint_manager = Account::<MintManager>::try_from(mint_manager_info)?;
            mint_manager.token_managers -= 1;
    
            let path = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref()];
            let bump_seed = assert_derivation(ctx.program_id, mint_manager_info, path)?;
            let mint_manager_seeds = &[MINT_MANAGER_SEED.as_bytes(), mint.as_ref(), &[bump_seed]];
            let mint_manager_signer = &[&mint_manager_seeds[..]];
            
            // thaw recipient account
            let cpi_accounts = ThawAccount {
                account: ctx.accounts.recipient_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: mint_manager_info.clone(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(mint_manager_signer);
            token::thaw_account(cpi_context)?;
            
        } else if token_manager.kind == TokenManagerKind::Edition as u8 {
            let edition_info = next_account_info(remaining_accs)?;
            let metadata_program = next_account_info(remaining_accs)?;
            // edition will be validated by metadata_program
            if metadata_program.key() != mpl_token_metadata::id() { return Err(error!(ErrorCode::InvalidMetadataProgramId)); }
            // assert_keys_eq!(metadata_program.key(), mpl_token_metadata::id());
            
            invoke_signed(
                &thaw_delegated_account(
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
    }

    if token_manager.invalidation_type == InvalidationType::Return as u8 || token_manager.state == TokenManagerState::Issued as u8 {
        let return_token_account_info = next_account_info(remaining_accs)?;
        let return_token_account: spl_token::state::Account = assert_initialized(return_token_account_info)?;
        if token_manager.receipt_mint == None {
            if return_token_account.owner != token_manager.issuer { return Err(error!(ErrorCode::InvalidIssuerTokenAccount)); }
        } else {
            let receipt_token_account_info = next_account_info(remaining_accs)?;
            let receipt_token_account: spl_token::state::Account = assert_initialized(receipt_token_account_info)?;
            if !(receipt_token_account.mint == token_manager.receipt_mint.unwrap() && receipt_token_account.amount > 0) { return Err(error!(ErrorCode::InvalidReceiptMintAccount))}
            if receipt_token_account.owner != return_token_account.owner { return Err(error!(ErrorCode::InvalidReceiptMintOwner)); }
        }

        // transfer back to issuer
        let cpi_accounts = Transfer {
            from: ctx.accounts.recipient_token_account.to_account_info(),
            to: return_token_account_info.to_account_info(),
            authority: token_manager.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
        token::transfer(cpi_context, token_manager.amount)?;
    }

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.collector.to_account_info(),
        authority: token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;
    
    token_manager.state = TokenManagerState::Invalidated as u8;
    token_manager.state_changed_at = Clock::get().unwrap().unix_timestamp;
    if token_manager.invalidation_type != InvalidationType::Invalidate as u8 {
        token_manager.close(ctx.accounts.collector.to_account_info())?;
    }
    return Ok(())
}
