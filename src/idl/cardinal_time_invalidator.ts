export type CardinalTimeInvalidator = {
  version: "0.2.15";
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
    }
  ];
};

export const IDL: CardinalTimeInvalidator = {
  version: "0.2.15",
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
  ],
};
