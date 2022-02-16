# Cardinal

[![License](https://img.shields.io/badge/license-AGPL%203.0-blue)](https://github.com/cardinal-labs/cardinal-token-manager/blob/master/LICENSE)
[![Release](https://github.com/cardinal-labs/cardinal-token-manager/actions/workflows/release.yml/badge.svg?branch=v0.0.27)](https://github.com/cardinal-labs/cardinal-token-manager/actions/workflows/release.yml)

<p align="center">
    <img src="./images/banner.png" />
</p>

<p align="center">
    An open protocol for issuing managed tokens on Solana.
</p>

## Background

Cardinal is a composable protocol for issuing conditional NFTs that are managed by the protocol. Using the invalidators and approvers in various ways allows for building rentals, in-game items, DNS services and more.

Carinal protocol provides a token-manager implementation as well as basic plugins for paid claim, permissioned transfer, and time invalidation. These plugins can be extended to support various use cases or similar ones built with entirely new logic for token handling the token invalidation.

## Packages

| Package                        | Description                                         | Version                                                                                                                             | Docs                                                                                                               |
| :----------------------------- | :-------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- |
| `cardinal-token-manager`       | Manages conditionally owned tokens                  | [![Crates.io](https://img.shields.io/crates/v/cardinal-token-manager)](https://crates.io/crates/cardinal-token-manager)             | [![Docs.rs](https://docs.rs/cardinal-token-manager/badge.svg)](https://docs.rs/cardinal-token-manager)             |
| `cardinal-paid-claim-approver` | Approves users to claim tokens from a token-manager | [![Crates.io](https://img.shields.io/crates/v/cardinal-paid-claim-approver)](https://crates.io/crates/cardinal-paid-claim-approver) | [![Docs.rs](https://docs.rs/cardinal-paid-claim-approver/badge.svg)](https://docs.rs/cardinal-paid-claim-approver) |
| `cardinal-time-invalidator`    | Invalidator for time-based token-managers           | [![Crates.io](https://img.shields.io/crates/v/cardinal-time-invalidator)](https://crates.io/crates/cardinal-time-invalidator)       | [![Docs.rs](https://docs.rs/cardinal-time-invalidator/badge.svg)](https://docs.rs/cardinal-time-invalidator)       |
| `cardinal-use-invalidator`     | Invalidator for use-based token-managers            | [![Crates.io](https://img.shields.io/crates/v/cardinal-use-invalidator)](https://crates.io/crates/cardinal-use-invalidator)         | [![Docs.rs](https://docs.rs/cardinal-use-invalidator/badge.svg)](https://docs.rs/cardinal-use-invalidator)         |
| `@cardinal/token-manager`      | TypeScript SDK for token-manager                    | [![npm](https://img.shields.io/npm/v/@cardinal/token-manager.svg)](https://www.npmjs.com/package/@cardinal/token-manager)           | [![Docs](https://img.shields.io/badge/docs-typedoc-blue)](https://cardinal-labs.github.io/cardinal-token-manager/) |

## Addresses

Program addresses are the same on devnet, testnet, and mainnet-beta.

- TokenManager: [`mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz`](https://explorer.solana.com/address/mgrMbgLbusR19KEKMa9WsYDAeL94Tavgc9JHRB1CCGz)
- PaidClaimApprover: [`pcaQ9jQLzb8VszyM6oPRoiGsdjizxMyvGjauhKPD5EF`](https://explorer.solana.com/address/pcaQ9jQLzb8VszyM6oPRoiGsdjizxMyvGjauhKPD5EF)
- TimeInvalidator: [`tmexpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe`](https://explorer.solana.com/address/tmexpMz3HojAQ4i97rgaJYhPHM9hV6AzWmQ7EprRPGe)
- UseInvalidator: [`useB5qbYZgjE14qXxWx17Zm4JS5bzWrDcWXt3uBq62L`](https://explorer.solana.com/address/useB5qbYZgjE14qXxWx17Zm4JS5bzWrDcWXt3uBq62L)

## Plugins

Cardinal token-manager is made to be composable. It allows for plugins for

1. Claim approvers
2. Transfer authorities
3. Invalidators

When instantiating a token-manager, the issuer can set a claim approver, transfer authority and invalidators that can control the claim, transfer and invalidate mechanisms. These are all plugins that can be pointed to any program-derived account or user owned account. Out of the box, there are basic plugins to power use and time rentals and subscriptions.

## Documentation

Documentation is a work in progress. For now, one should read [the tests](/tests/issueUnissue.spec.ts).

We soon plan on releasing a React library to make it easy to integrate Cardinal ui components with your frontend.

## License

Cardinal Protocol is licensed under the GNU Affero General Public License v3.0.

In short, this means that any changes to this code must be made open source and available under the AGPL-v3.0 license, even if only used privately.
