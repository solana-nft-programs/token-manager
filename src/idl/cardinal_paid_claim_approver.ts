export type CardinalPaidClaimApprover = {
  "version": "0.0.0",
  "name": "cardinal_paid_claim_approver",
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "claimApprover",
          "isMut": true,
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
        },
        {
          "name": "paymentAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pay",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "claimApprover",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payerTokenAccount",
          "isMut": true,
          "isSigner": false
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
      "name": "paidClaimApprover",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "paymentAmount",
            "type": "u64"
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
      "name": "InvalidPayerTokenAccount",
      "msg": "Token account not owned by the payer"
    },
    {
      "code": 302,
      "name": "InvalidTokenManager",
      "msg": "Invalid token manager for this claim approver"
    },
    {
      "code": 303,
      "name": "InvalidPaymentManager",
      "msg": "Payment manager is invalid"
    }
  ]
};

export const IDL: CardinalPaidClaimApprover = {
  "version": "0.0.0",
  "name": "cardinal_paid_claim_approver",
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
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "claimApprover",
          "isMut": true,
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
        },
        {
          "name": "paymentAmount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pay",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentManager",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "paymentManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "claimApprover",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "payerTokenAccount",
          "isMut": true,
          "isSigner": false
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
      "name": "paidClaimApprover",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "paymentAmount",
            "type": "u64"
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
      "name": "InvalidPayerTokenAccount",
      "msg": "Token account not owned by the payer"
    },
    {
      "code": 302,
      "name": "InvalidTokenManager",
      "msg": "Invalid token manager for this claim approver"
    },
    {
      "code": 303,
      "name": "InvalidPaymentManager",
      "msg": "Payment manager is invalid"
    }
  ]
};
