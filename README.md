# Cardinal

[![License](https://img.shields.io/badge/license-AGPL%203.0-blue)](https://github.com/cardinal-labs/cardinal-token-manager/blob/master/LICENSE)

<p align="center">
    <img src="/images/banner.png" />
</p>

<p align="center">
    An open protocol for issuing managed tokens on Solana.
</p>

## Background

Cardinal is a composable protocol for issuing conditional NFTs that are managed by the protocol. Using the invalidators and approvers in various ways allows for building rentals, in-game items, DNS services and more.

Carinal protocol provides a service for rentals that allow anybody to spin up their own rental manager with distinct parameters that allow their users to rent from the rental manager or create one-off rentals.

## Packages

| Package                        | Description                                                  | Version                                                                                                                             | Docs                                                                                                               |
| :----------------------------- | :----------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `cardinal-token-manager`       | Manages conditionally owned tokens                           | [![Crates.io](https://img.shields.io/crates/v/cardinal-token-manager)](https://crates.io/crates/cardinal-token-manager)             | [![Docs.rs](https://docs.rs/cardinal-token-manager/badge.svg)](https://docs.rs/cardinal-token-manager)             |
| `cardinal-payment-manager`     | Manages payment for token-managers                           | [![Crates.io](https://img.shields.io/crates/v/cardinal-payment-manager)](https://crates.io/crates/cardinal-payment-manager)         | [![Docs.rs](https://docs.rs/cardinal-payment-manager/badge.svg)](https://docs.rs/cardinal-payment-manager)         |
| `cardinal-paid-claim-approver` | Approves users to claim tokens from a token-manager          | [![Crates.io](https://img.shields.io/crates/v/cardinal-paid-claim-approver)](https://crates.io/crates/cardinal-paid-claim-approver) | [![Docs.rs](https://docs.rs/cardinal-paid-claim-approver/badge.svg)](https://docs.rs/cardinal-paid-claim-approver) |
| `cardinal-time-invalidator`    | Invalidator for time-based token-managers                    | [![Crates.io](https://img.shields.io/crates/v/cardinal-time-invalidator)](https://crates.io/crates/cardinal-time-invalidator)       | [![Docs.rs](https://docs.rs/cardinal-time-invalidator/badge.svg)](https://docs.rs/cardinal-time-invalidator)       |
| `cardinal-rental-counter`      | Counter for tracking a users issued tokens via token-manager | [![Crates.io](https://img.shields.io/crates/v/cardinal-rental-counter)](https://crates.io/crates/cardinal-rental-counter)           | [![Docs.rs](https://docs.rs/cardinal-rental-counter/badge.svg)](https://docs.rs/cardinal-rental-counter)           |
| `@cardinal/token-manager`      | TypeScript SDK for token-manager                             | [![npm](https://img.shields.io/npm/v/@cardinal/token-manager.svg)](https://www.npmjs.com/package/@cardinal/token-manager)           | [![Docs](https://img.shields.io/badge/docs-typedoc-blue)](https://docs.cardinal.so/ts/)                            |

## Addresses

Program addresses are the same on devnet, testnet, and mainnet-beta.

## Addresses

Program addresses are the same on devnet, testnet, and mainnet-beta.

- TokenManager: [`mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz`](https://explorer.solana.com/address/mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz)
- PaymentManager: [`cpmTAQfUopUzqu2BAR5EfnUfqJSgZkMoU7QBvkueyEn`](https://explorer.solana.com/address/cpmTAQfUopUzqu2BAR5EfnUfqJSgZkMoU7QBvkueyEn)
- PaidClaimApprover: [`pcaQ9jQLzb8VszyM6oPRoiGsdjizxMyvGjauhKPD5EF`](https://explorer.solana.com/address/pcaQ9jQLzb8VszyM6oPRoiGsdjizxMyvGjauhKPD5EF)
- TimeInvalidator: [`tmexpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe`](https://explorer.solana.com/address/tmexpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe)
- RentalCounter: [`cntQPZbfxBeLa8HVBbA4fApyAKh8mUxUVeaCjBLFSFP`](https://explorer.solana.com/address/cntQPZbfxBeLa8HVBbA4fApyAKh8mUxUVeaCjBLFSFP)

## Plugins

Cardinal token-manager is made to be composable. It allows for plugins for

1. Claim approvers
2. Transfer authorities
3. Invalidators

When instantiating a token-manager, the issuer can set a claim approver, transfer authority and invalidators that can control the claim, transfer and invalidate mechanisms. These are all plugins that can be pointed to any program-derived account or user owned account. Out of the box, there are basic plugins to power use and time rentals and subscriptions.

## Documentation

Documentation is a work in progress. For now, one should read [the end-to-end tests of the SDK](/tests/mintWrapper.spec.ts).

We soon plan on releasing a React library to make it easy to integrate Cardinal with your frontend.

## License

Cardinal Protocol is licensed under the GNU Affero General Public License v3.0.

In short, this means that any changes to this code must be made open source and available under the AGPL-v3.0 license, even if only used privately.
