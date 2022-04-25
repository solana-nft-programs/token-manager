export type CardinalTimeInvalidator = {
  version: "1.2.1";
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
      name: "extendExpiration";
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
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "paymentAmount";
          type: "u64";
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
        },
        {
          name: "rent";
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
          name: "timeInvalidator";
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
      name: "timeInvalidator";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "tokenManager";
            type: "publicKey";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "collector";
            type: "publicKey";
          },
          {
            name: "expiration";
            type: {
              option: "i64";
            };
          },
          {
            name: "durationSeconds";
            type: {
              option: "i64";
            };
          },
          {
            name: "extensionPaymentAmount";
            type: {
              option: "u64";
            };
          },
          {
            name: "extensionDurationSeconds";
            type: {
              option: "u64";
            };
          },
          {
            name: "extensionPaymentMint";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "maxExpiration";
            type: {
              option: "i64";
            };
          },
          {
            name: "disablePartialExtension";
            type: {
              option: "bool";
            };
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
            name: "collector";
            type: "publicKey";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "durationSeconds";
            type: {
              option: "i64";
            };
          },
          {
            name: "expiration";
            type: {
              option: "i64";
            };
          },
          {
            name: "extensionPaymentAmount";
            type: {
              option: "u64";
            };
          },
          {
            name: "extensionDurationSeconds";
            type: {
              option: "u64";
            };
          },
          {
            name: "extensionPaymentMint";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "maxExpiration";
            type: {
              option: "i64";
            };
          },
          {
            name: "disablePartialExtension";
            type: {
              option: "bool";
            };
          }
        ];
      };
    },
    {
      name: "ErrorCode";
      type: {
        kind: "enum";
        variants: [
          {
            name: "InvalidPaymentTokenAccount";
          },
          {
            name: "InvalidIssuer";
          },
          {
            name: "InvalidPayerTokenAccount";
          },
          {
            name: "InvalidIssuerTokenAccount";
          },
          {
            name: "InvalidTokenManager";
          },
          {
            name: "InvalidExpiration";
          },
          {
            name: "InvalidTimeInvalidator";
          },
          {
            name: "InvalidInstruction";
          },
          {
            name: "InvalidExtendExpiration";
          },
          {
            name: "InvalidPaymentMint";
          },
          {
            name: "InvalidExtensionAmount";
          },
          {
            name: "InvalidPaymentManagerTokenAccount";
          },
          {
            name: "InvalidCollector";
          },
          {
            name: "AccountDiscriminatorMismatch";
          }
        ];
      };
    }
  ];
};

export const IDL: CardinalTimeInvalidator = {
  version: "1.2.1",
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
      name: "extendExpiration",
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
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "paymentAmount",
          type: "u64",
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
        {
          name: "rent",
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
          name: "timeInvalidator",
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
      name: "timeInvalidator",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "tokenManager",
            type: "publicKey",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "collector",
            type: "publicKey",
          },
          {
            name: "expiration",
            type: {
              option: "i64",
            },
          },
          {
            name: "durationSeconds",
            type: {
              option: "i64",
            },
          },
          {
            name: "extensionPaymentAmount",
            type: {
              option: "u64",
            },
          },
          {
            name: "extensionDurationSeconds",
            type: {
              option: "u64",
            },
          },
          {
            name: "extensionPaymentMint",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "maxExpiration",
            type: {
              option: "i64",
            },
          },
          {
            name: "disablePartialExtension",
            type: {
              option: "bool",
            },
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
            name: "collector",
            type: "publicKey",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "durationSeconds",
            type: {
              option: "i64",
            },
          },
          {
            name: "expiration",
            type: {
              option: "i64",
            },
          },
          {
            name: "extensionPaymentAmount",
            type: {
              option: "u64",
            },
          },
          {
            name: "extensionDurationSeconds",
            type: {
              option: "u64",
            },
          },
          {
            name: "extensionPaymentMint",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "maxExpiration",
            type: {
              option: "i64",
            },
          },
          {
            name: "disablePartialExtension",
            type: {
              option: "bool",
            },
          },
        ],
      },
    },
    {
      name: "ErrorCode",
      type: {
        kind: "enum",
        variants: [
          {
            name: "InvalidPaymentTokenAccount",
          },
          {
            name: "InvalidIssuer",
          },
          {
            name: "InvalidPayerTokenAccount",
          },
          {
            name: "InvalidIssuerTokenAccount",
          },
          {
            name: "InvalidTokenManager",
          },
          {
            name: "InvalidExpiration",
          },
          {
            name: "InvalidTimeInvalidator",
          },
          {
            name: "InvalidInstruction",
          },
          {
            name: "InvalidExtendExpiration",
          },
          {
            name: "InvalidPaymentMint",
          },
          {
            name: "InvalidExtensionAmount",
          },
          {
            name: "InvalidPaymentManagerTokenAccount",
          },
          {
            name: "InvalidCollector",
          },
          {
            name: "AccountDiscriminatorMismatch",
          },
        ],
      },
    },
  ],
};
