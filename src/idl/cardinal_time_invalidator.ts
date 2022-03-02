export type CardinalTimeInvalidator = {
  version: "0.2.4";
  name: "cardinal_time_invalidator";
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
          name: "timeInvalidator";
          isMut: true;
          isSigner: false;
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
          name: "expiration";
          type: "i64";
        }
      ];
    },
    {
      name: "invalidate";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "timeInvalidator";
          isMut: true;
          isSigner: false;
        },
        {
          name: "invalidator";
          isMut: true;
          isSigner: true;
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
          name: "tokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: true;
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
          name: "timeInvalidator";
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
      name: "timeInvalidator";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "expiration";
            type: "i64";
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
      name: "InvalidIssuerTokenAccount";
      msg: "Token account not owned by the issuer";
    },
    {
      code: 6002;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this claim approver";
    },
    {
      code: 6003;
      name: "InvalidExpiration";
      msg: "Expiration has not passed yet";
    }
  ];
};

export const IDL: CardinalTimeInvalidator = {
  version: "0.2.4",
  name: "cardinal_time_invalidator",
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
          name: "timeInvalidator",
          isMut: true,
          isSigner: false,
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
          name: "expiration",
          type: "i64",
        },
      ],
    },
    {
      name: "invalidate",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "timeInvalidator",
          isMut: true,
          isSigner: false,
        },
        {
          name: "invalidator",
          isMut: true,
          isSigner: true,
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
          name: "tokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "recipientTokenAccount",
          isMut: true,
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
          name: "timeInvalidator",
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
      name: "timeInvalidator",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "expiration",
            type: "i64",
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
      name: "InvalidIssuerTokenAccount",
      msg: "Token account not owned by the issuer",
    },
    {
      code: 6002,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this claim approver",
    },
    {
      code: 6003,
      name: "InvalidExpiration",
      msg: "Expiration has not passed yet",
    },
  ],
};
