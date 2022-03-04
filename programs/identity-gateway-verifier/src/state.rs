use anchor_lang::prelude::*;

pub const GATEWAY_VALIDATOR_SEED: &[u8] = b"gateway-validator";
#[account]
pub struct GatewayValidator{
    pub bump: u8,
    pub network: Pubkey,
}
impl GatewayValidator{
    pub const SIZE: usize = 8 + 1 + 32 + 32;
}
