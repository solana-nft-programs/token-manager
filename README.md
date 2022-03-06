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

Cardinal is a composable protocol for issuing conditional NFTs that are managed by the protocol. Using the invalidators and approvers in various ways allows for building rentals, expiring in-game items, subscriptions, permits, tickets, passes and more.

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

- TokenManager: [`mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM`](https://explorer.solana.com/address/mgr99QFMYByTqGPWmNqunV7vBLmWWXdSrHUfV8Jf3JM)
- PaidClaimApprover: [`pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR`](https://explorer.solana.com/address/pcaBwhJ1YHp7UDA7HASpQsRUmUNwzgYaLQto2kSj1fR)
- TimeInvalidator: [`tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE`](https://explorer.solana.com/address/tmeEDp1RgoDtZFtx6qod3HkbQmv9LMe36uqKVvsLTDE)
- UseInvalidator: [`useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp`](https://explorer.solana.com/address/useZ65tbyvWpdYCLDJaegGK34Lnsi8S3jZdwx8122qp)

## Plugins

Cardinal token-manager is made to be composable. It allows for plugins for

1. Claim approvers
2. Transfer authorities
3. Invalidators

When instantiating a token-manager, the issuer can set a claim approver, transfer authority and invalidators that can control the claim, transfer and invalidate mechanisms. These are all plugins that can be pointed to any program-derived account or user owned account. Out of the box, there are basic plugins to power use and time rentals and subscriptions.

## Documentation

Documentation is a work in progress. For now, one should read [the tests](/tests/issueUnissue.spec.ts).

We soon plan on releasing a React library to make it easy to integrate Cardinal ui components with your frontend.

## Example usage

#### All rental parameters

```js
export type IssueParameters = {
  // Optional amount to pay to claim the token
  paymentAmount?: number,

  // Optional mint to accept payment up front
  paymentMint?: PublicKey,

  // Optional expiration when the token manager is automatically invalidated
  expiration?: number,

  // Optional duration after which the token manager is automatically invalidated
  durationSeconds?: number,

  // Optional parameters to expire this token manager based on time
  timeInvalidation?: {
    // Optional exact fixed expiration in UTC seconds
    expiration?: number,
    // Optional duration after token is claimed in seconds
    durationSeconds?: number,
    // Optional extension parameters to extend duration
    extension?: {
      // The amount rate needed for extension
      extensionPaymentAmount: number,
      // The duration added based on amount paid
      extensionDurationSeconds: number,
      // The mint to accept payment for extension
      paymentMint: PublicKey,
      // The max expiration limit on how long a rental can be extended
      maxExpiration?: number,
    },
  },

  // Optional parameters to expire this token manager based on usage
  useInvalidation?: {
    // Optional total usages allocated
    totalUsages?: number,
    // Optional use authority who can use this token
    useAuthority?: PublicKey,
    // Optional extension parameters to extend usages
    extension?: {
      // Number of usages to extend for this payment amount
      extensionUsages: number,
      // The mint to accept payment for extension
      extensionPaymentMint: PublicKey,
      // The amount needed to extend usages
      extensionPaymentAmount: number,
      // Optional limit for how many usages can be extended
      maxUsages?: number,
    },
  },

  // Mint of the tokens this token manager will manager
  mint: PublicKey,

  // Amoun of tokens to put into token manager, for NFTs this should use the default of 1
  amount?: BN,

  // Token account where the token is currently held
  issuerTokenAccountId: PublicKey,

  // Whether anyone can claim this or only the specified person with the link
  visibility?: "private" | "public",

  // What kind of token manager this is
  // /// Token a managed rental and will use freeze authority to manage the token
  // Managed = 1,
  // /// Token is unmanaged and can be traded freely until expiration
  // Unmanaged = 2,
  // /// Token is a metaplex edition and so it uses metaplex program to freeze
  // Edition = 3,
  kind?: TokenManagerKind,

  // What happens to the token upon invalidation
  // /// Upon invalidation it will be returned to the issuer
  // Return = 1,
  // /// Upon invalidation it will remain marked as invalid
  // Invalidate = 2,
  // /// Upon invalidation the token manager will be deleted and thus the tokens are released
  // Release = 3,
  invalidationType?: InvalidationType,

  // Whether the issuer wants to claim a receipt NFT from their rental
  receipt?: boolean,
};
```

---

<p>&nbsp;</p>

### Javascript create fixed price 24h rental

```
npm i @cardinal/token-manager
```

```javascript
import { Connection } from "@solana/web3.js";

// payment amount 10 for duration of 86400 seconds (24 hours)
const issueTokenParameters = {
  paymentAmount: new BN(10),
  paymentMint: new PublicKey("..."),
  durationSeconds: 86400,
  mint: new PublicKey("..."), // NFT rental mint
  issuerTokenAccountId: new PublicKey("..."),
  visibility: "public", // default public means anyone can claim this rental
  kind: TokenManagerKind.Edition, // used for metaplex master / editions,
  invalidationType: InvalidationType.Return, // indicates this token will be returned when invalidated
};

try {
  const [transaction] = await issueToken(issueTokenParameters);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("max")
  ).blockhash;
  transaction.sign(wallet, masterEditionMint);
  await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
    commitment: "confirmed",
  });
} catch (exception) {
  // handle exception
}
```

---

<p>&nbsp;</p>

### Javascript create single use ticket example

```
npm i @cardinal/token-manager
```

```javascript
import { Connection } from "@solana/web3.js";

// no payment specified, 1 usage and private link means only the holder of the link can claim it
// Releases on use as a memento
const issueTokenParameters = {
  useInvalidation: { totalUsages: 1 }, // 1 use
  mint: new PublicKey("..."), // ticket mint
  issuerTokenAccountId: new PublicKey("..."),
  visibility: "private", // private so you can send this out via email
  kind: TokenManagerKind.Edition, // used for metaplex master / editions,
  invalidationType: InvalidationType.Release, // indicates this token will be released after being used
};

try {
  const [transaction] = await issueToken(issueTokenParameters);
  transaction.feePayer = wallet.publicKey;
  transaction.recentBlockhash = (
    await connection.getRecentBlockhash("max")
  ).blockhash;
  transaction.sign(wallet, masterEditionMint);
  await sendAndConfirmRawTransaction(connection, transaction.serialize(), {
    commitment: "confirmed",
  });
} catch (exception) {
  // handle exception
}
```

---

<p>&nbsp;</p>

## Image generator

Cardinal also provides an image generator API. You provide your NFT metadata and image, or a URL to where its hosted, and use the url `https://api.cardinal.so/metadata/{mintId}` when minting the token and the API will dynamically update the image and metadata based on usages or expiration associated with it so that its always up to date forever and wherever it is viewed.

Reach out to team@cardinal.so if you are interested in using this service.

---

<p>&nbsp;</p>

## License

Cardinal Protocol is licensed under the GNU Affero General Public License v3.0.

In short, this means that any changes to this code must be made open source and available under the AGPL-v3.0 license, even if only used privately.
