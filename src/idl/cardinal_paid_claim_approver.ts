export type CardinalPaidClaimApprover = {
  version: "1.4.1";
  name: "cardinal_paid_claim_approver";
  instructions: [
    {
      name: "init";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "claimApprover";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "InitIx";
          };
        }
      ];
    },
    {
      name: "pay";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "paymentTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "feeCollectorTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "paymentManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "claimApprover";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "claimReceipt";
          isMut: true;
          isSigner: false;
        },
        {
          name: "cardinalTokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "cardinalPaymentManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "close";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "claimApprover";
          isMut: true;
          isSigner: false;
        },
        {
          name: "collector";
          isMut: true;
          isSigner: false;
        },
        {
          name: "closer";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "paidClaimApprover";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "tokenManager";
            type: "publicKey";
          },
          {
            name: "collector";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "InitIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "paymentMint";
            type: "publicKey";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "collector";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidPaymentTokenAccount";
      msg: "Token account not owned by the claim approver";
    },
    {
      code: 6001;
      name: "InvalidPaymentManagerTokenAccount";
      msg: "Token account incorrect mint";
    },
    {
      code: 6002;
      name: "InvalidPayerTokenAccount";
      msg: "Token account not owned by the payer";
    },
    {
      code: 6003;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this claim approver";
    },
    {
      code: 6004;
      name: "InvalidIssuer";
      msg: "Invalid issuer";
    },
    {
      code: 6005;
      name: "InvalidCollector";
      msg: "Invalid collector";
    },
    {
      code: 6006;
      name: "AccountDiscriminatorMismatch";
      msg: "Invalid account discriminator";
    },
    {
      code: 6007;
      name: "InvalidPaymentManagerProgram";
      msg: "Invalid payment manager program";
    },
    {
      code: 6008;
      name: "InvalidPaymentManager";
      msg: "Invalid payment manager";
    },
    {
      code: 6009;
      name: "InvalidPaymentMint";
      msg: "Invalid payment mint";
    }
  ];
};

export const IDL: CardinalPaidClaimApprover = {
  version: "1.4.1",
  name: "cardinal_paid_claim_approver",
  instructions: [
    {
      name: "init",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "claimApprover",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "InitIx",
          },
        },
      ],
    },
    {
      name: "pay",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "paymentTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "feeCollectorTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "paymentManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "claimApprover",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "claimReceipt",
          isMut: true,
          isSigner: false,
        },
        {
          name: "cardinalTokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "cardinalPaymentManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "close",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "claimApprover",
          isMut: true,
          isSigner: false,
        },
        {
          name: "collector",
          isMut: true,
          isSigner: false,
        },
        {
          name: "closer",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "paidClaimApprover",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "tokenManager",
            type: "publicKey",
          },
          {
            name: "collector",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "InitIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "paymentMint",
            type: "publicKey",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "collector",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidPaymentTokenAccount",
      msg: "Token account not owned by the claim approver",
    },
    {
      code: 6001,
      name: "InvalidPaymentManagerTokenAccount",
      msg: "Token account incorrect mint",
    },
    {
      code: 6002,
      name: "InvalidPayerTokenAccount",
      msg: "Token account not owned by the payer",
    },
    {
      code: 6003,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this claim approver",
    },
    {
      code: 6004,
      name: "InvalidIssuer",
      msg: "Invalid issuer",
    },
    {
      code: 6005,
      name: "InvalidCollector",
      msg: "Invalid collector",
    },
    {
      code: 6006,
      name: "AccountDiscriminatorMismatch",
      msg: "Invalid account discriminator",
    },
    {
      code: 6007,
      name: "InvalidPaymentManagerProgram",
      msg: "Invalid payment manager program",
    },
    {
      code: 6008,
      name: "InvalidPaymentManager",
      msg: "Invalid payment manager",
    },
    {
      code: 6009,
      name: "InvalidPaymentMint",
      msg: "Invalid payment mint",
    },
  ],
};
