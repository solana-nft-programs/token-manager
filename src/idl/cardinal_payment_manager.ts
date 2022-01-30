export type CardinalPaymentManager = {
  "version": "0.0.0",
  "name": "cardinal_payment_manager",
  "instructions": [
    {
      "name": "init",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "settle",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "invalidator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "paymentManager",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "paymentMint",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 300,
      "name": "InvalidPaymentTokenAccount",
      "msg": "Token account not owned by the claim approver"
    },
    {
      "code": 301,
      "name": "InvalidIssuerTokenAccount",
      "msg": "Token account not owned by the issuer"
    },
    {
      "code": 302,
      "name": "InvalidTokenManager",
      "msg": "Invalid token manager for this claim approver"
    }
  ]
};

export const IDL: CardinalPaymentManager = {
  "version": "0.0.0",
  "name": "cardinal_payment_manager",
  "instructions": [
    {
      "name": "init",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentMint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "settle",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "paymentManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "invalidator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "paymentManager",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "paymentMint",
            "type": "publicKey"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 300,
      "name": "InvalidPaymentTokenAccount",
      "msg": "Token account not owned by the claim approver"
    },
    {
      "code": 301,
      "name": "InvalidIssuerTokenAccount",
      "msg": "Token account not owned by the issuer"
    },
    {
      "code": 302,
      "name": "InvalidTokenManager",
      "msg": "Invalid token manager for this claim approver"
    }
  ]
};
