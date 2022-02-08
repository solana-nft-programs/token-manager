export type CardinalRentReceipt = {
  version: "0.0.0";
  name: "cardinal_rent_receipt";
  instructions: [
    {
      name: "claim";
      accounts: [
        {
          name: "mintCounter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rentReceipt";
          isMut: true;
          isSigner: false;
        },
        {
          name: "rentReceiptTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "receiptTokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "receiptTokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "cardinalTokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "recipient";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
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
      args: [
        {
          name: "bump";
          type: "u8";
        },
        {
          name: "receiptManagerBump";
          type: "u8";
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
          name: "rentReceipt";
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
          name: "tokenManagerTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "issuerTokenAccount";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "rentReceipt";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "receiptManager";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 300;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this rent receipt";
    }
  ];
};

export const IDL: CardinalRentReceipt = {
  version: "0.0.0",
  name: "cardinal_rent_receipt",
  instructions: [
    {
      name: "claim",
      accounts: [
        {
          name: "mintCounter",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rentReceipt",
          isMut: true,
          isSigner: false,
        },
        {
          name: "rentReceiptTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiptTokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiptTokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "cardinalTokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "recipient",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
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
      args: [
        {
          name: "bump",
          type: "u8",
        },
        {
          name: "receiptManagerBump",
          type: "u8",
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
          name: "rentReceipt",
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
          name: "tokenManagerTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "recipientTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "issuerTokenAccount",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "rentReceipt",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "receiptManager",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 300,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this rent receipt",
    },
  ],
};
