export type CardinalReceiptIndex = {
  version: "0.2.6";
  name: "cardinal_receipt_index";
  instructions: [
    {
      name: "claim";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "receiptMarker";
          isMut: true;
          isSigner: false;
        },
        {
          name: "receiptMarkerTokenAccount";
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
          name: "receiptMint";
          isMut: true;
          isSigner: true;
        },
        {
          name: "receiptMintMetadata";
          isMut: true;
          isSigner: false;
        },
        {
          name: "receiptMintMasterEdition";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
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
          name: "associatedToken";
          isMut: false;
          isSigner: false;
        },
        {
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMetadataProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "name";
          type: "string";
        },
        {
          name: "kind";
          type: "u8";
        },
        {
          name: "invalidationType";
          type: "u8";
        }
      ];
    },
    {
      name: "invalidate";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "receiptMarker";
          isMut: true;
          isSigner: false;
        },
        {
          name: "invalidator";
          isMut: false;
          isSigner: true;
        },
        {
          name: "cardinalTokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "receiptTokenManagerTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "receiptMarkerTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "receiptMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    }
  ];
  accounts: [
    {
      name: "receiptMarker";
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
  types: [
    {
      name: "ErrorCode";
      type: {
        kind: "enum";
        variants: [
          {
            name: "SlotNumberTooLarge";
          },
          {
            name: "InvalidIssuer";
          },
          {
            name: "InvalidTokenManager";
          },
          {
            name: "MustInvalidateReceipt";
          },
          {
            name: "InvalidTokenManagerKind";
          },
          {
            name: "InvalidInvalidationType";
          }
        ];
      };
    }
  ];
};

export const IDL: CardinalReceiptIndex = {
  version: "0.2.6",
  name: "cardinal_receipt_index",
  instructions: [
    {
      name: "claim",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiptMarker",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiptMarkerTokenAccount",
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
          name: "receiptMint",
          isMut: true,
          isSigner: true,
        },
        {
          name: "receiptMintMetadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiptMintMasterEdition",
          isMut: true,
          isSigner: false,
        },
        {
          name: "recipientTokenAccount",
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
          name: "associatedToken",
          isMut: false,
          isSigner: false,
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "name",
          type: "string",
        },
        {
          name: "kind",
          type: "u8",
        },
        {
          name: "invalidationType",
          type: "u8",
        },
      ],
    },
    {
      name: "invalidate",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "receiptMarker",
          isMut: true,
          isSigner: false,
        },
        {
          name: "invalidator",
          isMut: false,
          isSigner: true,
        },
        {
          name: "cardinalTokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "receiptTokenManagerTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "receiptMarkerTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "receiptMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "recipientTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "receiptMarker",
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
  types: [
    {
      name: "ErrorCode",
      type: {
        kind: "enum",
        variants: [
          {
            name: "SlotNumberTooLarge",
          },
          {
            name: "InvalidIssuer",
          },
          {
            name: "InvalidTokenManager",
          },
          {
            name: "MustInvalidateReceipt",
          },
          {
            name: "InvalidTokenManagerKind",
          },
          {
            name: "InvalidInvalidationType",
          },
        ],
      },
    },
  ],
};
