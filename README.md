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

The Token Manager program is a wrapper protocol that achieves conditional ownership of Solana NFTs. It allows one to issue an NFT to another party with embedded mechanisms for programmatic management of the token while it sits in their wallet. Among others, things like time-based expiration, usage-based expiration, selective transferability, and non-transferability are possible with the Token Manager. Its modular design uses “plugin” invalidators, approval authorities, and transfer authorities modeled as separate smart contracts to allow for theoretically any custom invalidation, claiming, and transfer logic tied to on-chain data. We currently offer two out-of-the-box invalidator plugins to support basic time and usage-based expiration as well as a basic payment-based claim approver.

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

All of these are modeled are separate programs so users can choose to implement custom logic in a separate program for claim, transfer and invalidation.

## Documentation

### Invalidation Types

The program generalizes the concept of invalidation into a list of invalidators so any of those public keys can trigger the invalidation of the token. The invalidation type field is used to specify "what happens" when invalidation is triggered.

```
#[derive(Clone, Debug, PartialEq, AnchorSerialize, AnchorDeserialize)]
#[repr(u8)]
pub enum InvalidationType {
    /// Upon invalidation it will be returned to the issuer
    Return = 1,
    /// Upon invalidation it will remain marked as invalid
    Invalidate = 2,
    /// Upon invalidation the token manager will be deleted and thus the tokens are released
    Release = 3,
    /// Upon invalidation the token manager will be reset back to issued state
    Reissue = 4,
}
```

### Claim Authority

The concept of claim_authority allows for the issuer to specify specific public key that can approve claiming of the tokens. This can be used in a few contexts.

1. using Keypair.generate() to create a new private key and embed that into a URL as a one-time password. This allows only the recipient of this URL to claim the token. This provides an easy way to distribute tokens via off-chain systems like email.
2. Paid claim approver, a program that is provided out of the box to enforce payment of a specified mint before claiming
3. Checking ownership of a given NFT or token to only allow holders, members in DAOs etc to claim the token.
4. Many, many more!

If not set, this token can be claimed by anyone.

### Transfer Authority

Similar to claim_authority, but a specified publickey that can approve transfer of this token. Because the tokens by default are frozen, normal transfer does not work. Instead a transfer_authority can be used to allow transfers to specified wallet. By default, transfer_authority is set to the token_manager itself, rendering it non-transferable. If unset, the token can be freely transferred. The transfer is modeled by receiving a transfer_receipt that can be used to claim the token. Use cases of transfer_authority can include

1. A system that groups wallets together allowing transfer between "known" wallets all owned by the same user
2. Encoding a transfer schedule in a program on-chain to approve a rotation of the token, similar to a time-share.
3. A paid transfer that allows someone to pay some amount to the current holder in order to get approved for transfer
4. KYC approval required before transfer
5. Transfer between members of a DAO / multi-sig
6. ...

NOTE: Once approved for transfer, the approved party can claim the token from the current holder. This is due to the fact that as a recipient (new holder) you must sign the transaction to "accept" the tokens, because part of this process involved delegating the tokens back to the token-manager. This means that approved parties can effectively "take" the token from the current holder.

### Receipts

The concept of receipts allows the issuer of token(s) into a token-manager to mint a receipt NFT representing this token-manager. Coupled with InvalidationType::Return above, the receipt can be freely traded and represent the public key that the token(s) will be returned to when they are invalidated. This essentially represents the underlying asset during outstanding rentals.

### Token Manager ERD

<img width="877" alt="DIAGRAM" src="https://user-images.githubusercontent.com/7113086/157140752-02983b0d-3501-42dd-add6-ea29fa37be80.png">
View Online: https://dbdiagram.io/d/6226977961d06e6eadbc77be

Documentation is a work in progress. For now, one should read [the tests](https://github.com/cardinal-labs/cardinal-token-manager/blob/main/tests/issueUnissue.spec.ts).

We soon plan on releasing a React library to make it easy to integrate Cardinal ui components with your frontend.

## Example usage

#### All token issue parameters

```js
export type IssueParameters = {
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

  // Optional parameters to specify an up front payment that must be paid before claim
  claimPayment?: {
    // Mint of the tokens required for payment
    paymentMint: PublicKey,
    // Amount of the tokens required for payment
    paymentAmount: number,
  },

  // Optional parameters to expire this token manager based on time
  timeInvalidation?: {
    // Optional exact fixed expiration in UTC seconds, not to be used along with durationSeconds
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
      // Whether this rental allows for partial extension or only in increments of extensionDurationSeconds
      disablePartialExtension?: boolean,
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

  // What happens to the token upon invalidation
  // /// Upon invalidation it will be returned to the issuer
  // Return = 1,
  // /// Upon invalidation it will remain marked as invalid
  // Invalidate = 2,
  // /// Upon invalidation the token manager will be deleted and thus the tokens are released
  // Release = 3,
  invalidationType?: InvalidationType,

  // Whether the issuer wants to claim a receipt NFT from their rental - this receipt allows the issuer to trade the underlying asset and future rental income
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
