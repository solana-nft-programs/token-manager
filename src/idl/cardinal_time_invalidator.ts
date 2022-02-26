export type CardinalTimeInvalidator = {
  version: "0.0.0";
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
          name: "duration";
          type: "i64";
        },
        {
          name: "startOnInit";
          type: "bool";
        }
      ];
    },
    {
      name: "setExpiration";
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
        }
      ];
      args: [];
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
            type: {
              option: "i64";
            };
          },
          {
            name: "tokenManager";
            type: "publicKey";
          },
          {
            name: "duration";
            type: "i64";
          },
          {
            name: "startOnInit";
            type: "bool";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 300;
      name: "InvalidPaymentTokenAccount";
      msg: "Token account not owned by the claim approver";
    },
    {
      code: 301;
      name: "InvalidIssuerTokenAccount";
      msg: "Token account not owned by the issuer";
    },
    {
      code: 302;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this claim approver";
    },
    {
      code: 303;
      name: "InvalidExpiration";
      msg: "Expiration has not passed yet";
    },
    {
      code: 304;
      name: "InvalidTimeInvalidator";
      msg: "Invalid time invalidator";
    }
  ];
};

export const IDL: CardinalTimeInvalidator = {
  version: "0.0.0",
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
          name: "duration",
          type: "i64",
        },
        {
          name: "startOnInit",
          type: "bool",
        },
      ],
    },
    {
      name: "setExpiration",
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
      ],
      args: [],
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
            type: {
              option: "i64",
            },
          },
          {
            name: "tokenManager",
            type: "publicKey",
          },
          {
            name: "duration",
            type: "i64",
          },
          {
            name: "startOnInit",
            type: "bool",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 300,
      name: "InvalidPaymentTokenAccount",
      msg: "Token account not owned by the claim approver",
    },
    {
      code: 301,
      name: "InvalidIssuerTokenAccount",
      msg: "Token account not owned by the issuer",
    },
    {
      code: 302,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this claim approver",
    },
    {
      code: 303,
      name: "InvalidExpiration",
      msg: "Expiration has not passed yet",
    },
    {
      code: 304,
      name: "InvalidTimeInvalidator",
      msg: "Invalid time invalidator",
    },
  ],
};
