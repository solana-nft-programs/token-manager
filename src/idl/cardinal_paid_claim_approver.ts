export type CardinalPaidClaimApprover = {
  version: "0.0.0";
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
          name: "paymentMint";
          type: "publicKey";
        },
        {
          name: "paymentAmount";
          type: "u64";
        },
        {
          name: "collector";
          type: "publicKey";
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
          name: "paymentManagerTokenAccount";
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
      name: "ErrorCode";
      type: {
        kind: "enum";
        variants: [
          {
            name: "InvalidPaymentTokenAccount";
          },
          {
            name: "InvalidPaymentManagerTokenAccount";
          },
          {
            name: "InvalidPayerTokenAccount";
          },
          {
            name: "InvalidTokenManager";
          },
          {
            name: "InvalidIssuer";
          },
          {
            name: "InvalidCloser";
          }
        ];
      };
    }
  ];
};

export const IDL: CardinalPaidClaimApprover = {
  version: "0.0.0",
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
          name: "paymentMint",
          type: "publicKey",
        },
        {
          name: "paymentAmount",
          type: "u64",
        },
        {
          name: "collector",
          type: "publicKey",
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
          name: "paymentManagerTokenAccount",
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
      name: "ErrorCode",
      type: {
        kind: "enum",
        variants: [
          {
            name: "InvalidPaymentTokenAccount",
          },
          {
            name: "InvalidPaymentManagerTokenAccount",
          },
          {
            name: "InvalidPayerTokenAccount",
          },
          {
            name: "InvalidTokenManager",
          },
          {
            name: "InvalidIssuer",
          },
          {
            name: "InvalidCloser",
          },
        ],
      },
    },
  ],
};
