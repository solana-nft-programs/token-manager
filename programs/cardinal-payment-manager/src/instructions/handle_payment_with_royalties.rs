use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer},
    mpl_token_metadata::state::Metadata,
};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct HandlePaymentWithRoyaltiesCtx<'info> {
    #[account(mut)]
    payment_manager: Box<Account<'info, PaymentManager>>,

    #[account(mut)]
    payer_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = fee_collector_token_account.owner == payment_manager.fee_collector @ ErrorCode::InvalidFeeCollectorTokenAccount)]
    fee_collector_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    payment_token_account: Box<Account<'info, TokenAccount>>,

    payment_mint: Box<Account<'info, Mint>>,
    mint: Box<Account<'info, Mint>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    mint_metadata: AccountInfo<'info>,

    payer: Signer<'info>,
    token_program: Program<'info, Token>,
    // > Remaining accounts for each mint creator
    // creator token account
}

pub fn handler<'key, 'accounts, 'remaining, 'info>(ctx: Context<'key, 'accounts, 'remaining, 'info, HandlePaymentWithRoyaltiesCtx<'info>>, payment_amount: u64) -> Result<()> {
    let payment_manager = &mut ctx.accounts.payment_manager;

    // maker-taker fees
    let maker_fee = payment_amount
        .checked_mul(payment_manager.maker_fee_basis_points.into())
        .expect("Multiplication error")
        .checked_div(BASIS_POINTS_DIVISOR.into())
        .expect("Division error");
    let taker_fee = payment_amount
        .checked_mul(payment_manager.taker_fee_basis_points.into())
        .expect("Multiplication error")
        .checked_div(BASIS_POINTS_DIVISOR.into())
        .expect("Division error");
    let total_fees = maker_fee.checked_add(taker_fee).expect("Add error");

    // royalties
    let mut fees_paid_out: u64 = 0;
    if !ctx.accounts.mint_metadata.data_is_empty() {
        if ctx.accounts.mint_metadata.to_account_info().owner.key() != mpl_token_metadata::id() {
            return Err(error!(ErrorCode::InvalidMintMetadataOwner));
        }
        let mint_metadata_data = ctx.accounts.mint_metadata.try_borrow_mut_data().expect("Failed to borrow data");
        let mint_metadata = Metadata::deserialize(&mut mint_metadata_data.as_ref()).expect("Failed to deserialize metadata");
        if mint_metadata.mint != ctx.accounts.mint.key() {
            return Err(error!(ErrorCode::InvalidMintMetadata));
        }

        let total_creators_fee = total_fees.checked_mul(DEFAULT_ROYALTY_FEE_SHARE).unwrap().checked_div(100).expect("Div error");
        if total_creators_fee > 0 {
            if let Some(creators) = mint_metadata.data.creators {
                let remaining_accs = &mut ctx.remaining_accounts.iter();
                for creator in creators {
                    if creator.share != 0 {
                        let creator_token_account_info = next_account_info(remaining_accs)?;
                        let creator_token_account = Account::<TokenAccount>::try_from(creator_token_account_info)?;
                        if creator_token_account.owner != creator.address && creator_token_account.mint != ctx.accounts.payment_mint.key() {
                            return Err(error!(ErrorCode::InvalidTokenAccount));
                        }
                        let share = u64::try_from(creator.share).expect("Could not cast u8 to u64");
                        let creator_fee_amount = total_creators_fee.checked_mul(share).unwrap().checked_div(100).expect("Div error");

                        if creator_fee_amount > 0 {
                            fees_paid_out = fees_paid_out.checked_add(creator_fee_amount).expect("Add error");
                            let cpi_accounts = Transfer {
                                from: ctx.accounts.payer_token_account.to_account_info(),
                                to: creator_token_account_info.to_account_info(),
                                authority: ctx.accounts.payer.to_account_info(),
                            };
                            let cpi_program = ctx.accounts.token_program.to_account_info();
                            let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
                            token::transfer(cpi_context, creator_fee_amount)?;
                        }
                    }
                }
            }
        }
    }

    // pay remaining fees to fee_colector
    if total_fees.checked_sub(fees_paid_out).expect("Sub error") > 0 {
        let cpi_accounts = Transfer {
            from: ctx.accounts.payer_token_account.to_account_info(),
            to: ctx.accounts.fee_collector_token_account.to_account_info(),
            authority: ctx.accounts.payer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_context, total_fees.checked_sub(fees_paid_out).expect("Add error"))?;
    }

    // pay target
    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.payment_token_account.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_context = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_context, payment_amount.checked_sub(maker_fee).expect("Sub error"))?;

    Ok(())
}
