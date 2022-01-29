use {
    crate::{state::*, errors::*},
    anchor_lang::{prelude::*, AccountsClose},
    anchor_spl::{token::{self, Token, TokenAccount, Mint, Transfer, ThawAccount, CloseAccount}}
};

#[derive(Accounts)]
pub struct InvalidateCtx<'info> {
    #[account(mut, constraint = token_manager.state == TokenManagerState::Issued as u8)]
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
    pub recipient: Signer<'info>,
    #[account(mut, constraint =
        recipient_token_account.owner == recipient.key()
        && recipient_token_account.mint == token_manager.mint
        @ ErrorCode::InvalidIssuerTokenAccount
    )]
    pub recipient_token_account: Box<Account<'info, TokenAccount>>,

    // issuer
    #[account(mut, constraint = issuer_token_account.owner == token_manager.issuer @ ErrorCode::InvalidIssuerTokenAccount)]
    pub issuer_token_account: Box<Account<'info, TokenAccount>>,

    // other
    #[account(mut)]
    pub invalidator: Signer<'info>,
    // #[account(mut, constraint = invalidator_toker_account.owner == invalidator.key() @ ErrorCode::InvalidInvalidatorTokenAccount)]
    // pub invalidator_toker_account: Box<Account<'info, TokenAccount>>,

    token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<InvalidateCtx>) -> ProgramResult {
    let token_manager = &mut ctx.accounts.token_manager;

    // get PDA seeds to sign with
    let mint = token_manager.mint;
    let token_manager_seeds = &[TOKEN_MANAGER_SEED.as_bytes(), mint.as_ref(), &[token_manager.bump]];
    let token_manager_signer = &[&token_manager_seeds[..]];

    if token_manager.state == TokenManagerState::Claimed as u8 {
        // if managed we need to thaw and transfer
        if token_manager.kind == TokenManagerKind::Managed as u8 {
            // thaw recipient account
            let cpi_accounts = ThawAccount {
                account: ctx.accounts.recipient_token_account.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::thaw_account(cpi_context)?;

            // transfer back to issuer
            let cpi_accounts = Transfer {
                from: ctx.accounts.recipient_token_account.to_account_info(),
                to: ctx.accounts.issuer_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;

            // close token manager
            token_manager.close(ctx.accounts.invalidator.to_account_info())?;
        }
    } else {
        if token_manager.kind == TokenManagerKind::Managed as u8 {
            // transfer back to issuer
            let cpi_accounts = Transfer {
                from: ctx.accounts.token_manager_token_account.to_account_info(),
                to: ctx.accounts.issuer_token_account.to_account_info(),
                authority: token_manager.to_account_info(),
            };
            let cpi_program = ctx.accounts.token_program.to_account_info();
            let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            token::transfer(cpi_context, token_manager.amount)?;
            
            // close token manager
            token_manager.close(ctx.accounts.invalidator.to_account_info())?;
        } else {
            // transfer to invalidator
            // let cpi_accounts = Transfer {
            //     from: ctx.accounts.token_manager_token_account.to_account_info(),
            //     to: ctx.accounts.invalidator_toker_account.to_account_info(),
            //     authority: token_manager.to_account_info(),
            // };
            // let cpi_program = ctx.accounts.token_program.to_account_info();
            // let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
            // token::transfer(cpi_context, token_manager.amount)?;
            token_manager.state = TokenManagerState::Invalidated as u8;
        }
    }

    // close token_manager_token_account
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.token_manager_token_account.to_account_info(),
        destination: ctx.accounts.invalidator.to_account_info(),
        authority: token_manager.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts).with_signer(token_manager_signer);
    token::close_account(cpi_context)?;
    return Ok(())
}
