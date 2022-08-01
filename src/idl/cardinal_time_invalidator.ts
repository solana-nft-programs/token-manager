export type CardinalTimeInvalidator = {
  version: "1.4.13";
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
          name: "paymentManager";
          isMut: true;
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
        },
        {
          name: "cardinalPaymentManager";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "secondsToAdd";
          type: "u64";
        }
      ];
    },
    {
      name: "resetExpiration";
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
  errors: [
    {
      code: 6000;
      name: "InvalidPaymentTokenAccount";
      msg: "Token account not owned by the claim approver";
    },
    {
      code: 6001;
      name: "InvalidIssuer";
      msg: "Invalid issuer";
    },
    {
      code: 6002;
      name: "InvalidPayerTokenAccount";
      msg: "Token account not owned by the issuer";
    },
    {
      code: 6003;
      name: "InvalidIssuerTokenAccount";
      msg: "Invalid token manager for this claim approver";
    },
    {
      code: 6004;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this claim approver";
    },
    {
      code: 6005;
      name: "InvalidExpiration";
      msg: "Expiration has not passed yet";
    },
    {
      code: 6006;
      name: "InvalidTimeInvalidator";
      msg: "Invalid time invalidator";
    },
    {
      code: 6007;
      name: "InvalidInstruction";
      msg: "Invalid instruction";
    },
    {
      code: 6008;
      name: "InvalidExtendExpiration";
      msg: "Max expiration exceeded";
    },
    {
      code: 6009;
      name: "InvalidPaymentMint";
      msg: "Invalid payment mint on time invalidator";
    },
    {
      code: 6010;
      name: "InvalidExtensionAmount";
      msg: "Invalid extension partial duration not allowed";
    },
    {
      code: 6011;
      name: "InvalidPaymentManagerTokenAccount";
      msg: "Token account incorrect mint";
    },
    {
      code: 6012;
      name: "InvalidCollector";
      msg: "Invalid collector";
    },
    {
      code: 6013;
      name: "AccountDiscriminatorMismatch";
      msg: "Account discriminator is incorrect";
    },
    {
      code: 6014;
      name: "InvalidTokenManagerState";
      msg: "Invalid token manager state for resetting expiration";
    },
    {
      code: 6015;
      name: "InvalidPaymentManagerProgram";
      msg: "Invalid payment manager program";
    },
    {
      code: 6016;
      name: "InvalidPaymentManager";
      msg: "Invalid payment manager";
    },
    {
      code: 6017;
      name: "InvalidMint";
      msg: "Invalid mint";
    }
  ];
};

export const IDL: CardinalTimeInvalidator = {
  version: "1.4.13",
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
          name: "paymentManager",
          isMut: true,
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
        {
          name: "cardinalPaymentManager",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "secondsToAdd",
          type: "u64",
        },
      ],
    },
    {
      name: "resetExpiration",
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
  errors: [
    {
      code: 6000,
      name: "InvalidPaymentTokenAccount",
      msg: "Token account not owned by the claim approver",
    },
    {
      code: 6001,
      name: "InvalidIssuer",
      msg: "Invalid issuer",
    },
    {
      code: 6002,
      name: "InvalidPayerTokenAccount",
      msg: "Token account not owned by the issuer",
    },
    {
      code: 6003,
      name: "InvalidIssuerTokenAccount",
      msg: "Invalid token manager for this claim approver",
    },
    {
      code: 6004,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this claim approver",
    },
    {
      code: 6005,
      name: "InvalidExpiration",
      msg: "Expiration has not passed yet",
    },
    {
      code: 6006,
      name: "InvalidTimeInvalidator",
      msg: "Invalid time invalidator",
    },
    {
      code: 6007,
      name: "InvalidInstruction",
      msg: "Invalid instruction",
    },
    {
      code: 6008,
      name: "InvalidExtendExpiration",
      msg: "Max expiration exceeded",
    },
    {
      code: 6009,
      name: "InvalidPaymentMint",
      msg: "Invalid payment mint on time invalidator",
    },
    {
      code: 6010,
      name: "InvalidExtensionAmount",
      msg: "Invalid extension partial duration not allowed",
    },
    {
      code: 6011,
      name: "InvalidPaymentManagerTokenAccount",
      msg: "Token account incorrect mint",
    },
    {
      code: 6012,
      name: "InvalidCollector",
      msg: "Invalid collector",
    },
    {
      code: 6013,
      name: "AccountDiscriminatorMismatch",
      msg: "Account discriminator is incorrect",
    },
    {
      code: 6014,
      name: "InvalidTokenManagerState",
      msg: "Invalid token manager state for resetting expiration",
    },
    {
      code: 6015,
      name: "InvalidPaymentManagerProgram",
      msg: "Invalid payment manager program",
    },
    {
      code: 6016,
      name: "InvalidPaymentManager",
      msg: "Invalid payment manager",
    },
    {
      code: 6017,
      name: "InvalidMint",
      msg: "Invalid mint",
    },
  ],
};
