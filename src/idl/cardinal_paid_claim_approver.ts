export type CardinalPaidClaimApprover = {
  version: "0.2.16";
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
      name: "InvalidPayerTokenAccount";
      msg: "Token account not owned by the payer";
    },
    {
      code: 6002;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this claim approver";
    },
    {
      code: 6003;
      name: "InvalidIssuer";
      msg: "Invalid issuer";
    }
  ];
};

export const IDL: CardinalPaidClaimApprover = {
  version: "0.2.16",
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
      name: "InvalidPayerTokenAccount",
      msg: "Token account not owned by the payer",
    },
    {
      code: 6002,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this claim approver",
    },
    {
      code: 6003,
      name: "InvalidIssuer",
      msg: "Invalid issuer",
    },
  ],
};
