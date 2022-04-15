export type CardinalUseInvalidator = {
  version: "1.1.0";
  name: "cardinal_use_invalidator";
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
          name: "useInvalidator";
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
      name: "incrementUsages";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "useInvalidator";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "user";
          isMut: false;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "numUsages";
          type: "u64";
        }
      ];
    },
    {
      name: "extendUsages";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "useInvalidator";
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
          name: "useInvalidator";
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
          name: "useInvalidator";
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
      name: "useInvalidator";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "usages";
            type: "u64";
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
            name: "useAuthority";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "totalUsages";
            type: {
              option: "u64";
            };
          },
          {
            name: "extensionPaymentAmount";
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
            name: "extensionUsages";
            type: {
              option: "u64";
            };
          },
          {
            name: "maxUsages";
            type: {
              option: "u64";
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
            name: "totalUsages";
            type: {
              option: "u64";
            };
          },
          {
            name: "maxUsages";
            type: {
              option: "u64";
            };
          },
          {
            name: "useAuthority";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "extensionPaymentAmount";
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
            name: "extensionUsages";
            type: {
              option: "u64";
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
      msg: "Token account not owned by the use invalidator";
    },
    {
      code: 6001;
      name: "InvalidPayerTokenAccount";
      msg: "Token account not owned by the issuer";
    },
    {
      code: 6002;
      name: "InvalidTokenAccount";
      msg: "Token account not owned by the issuer";
    },
    {
      code: 6003;
      name: "InvalidUser";
      msg: "User is not permitted to use";
    },
    {
      code: 6004;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this use invalidator";
    },
    {
      code: 6005;
      name: "InsufficientUsages";
      msg: "Usages at the maximum";
    },
    {
      code: 6006;
      name: "InvalidUseInvalidator";
      msg: "Invalid use invalidator";
    },
    {
      code: 6007;
      name: "MaxUsagesReached";
      msg: "Max usages reached";
    },
    {
      code: 6008;
      name: "InvalidExtensionAmount";
      msg: "Extension must be a multiple of extension payment";
    },
    {
      code: 6009;
      name: "InvalidPaymentManagerTokenAccount";
      msg: "Token account incorrect mint";
    },
    {
      code: 6010;
      name: "InvalidCollector";
      msg: "Invalid collector";
    }
  ];
};

export const IDL: CardinalUseInvalidator = {
  version: "1.1.0",
  name: "cardinal_use_invalidator",
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
          name: "useInvalidator",
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
      name: "incrementUsages",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "useInvalidator",
          isMut: true,
          isSigner: false,
        },
        {
          name: "recipientTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "user",
          isMut: false,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "numUsages",
          type: "u64",
        },
      ],
    },
    {
      name: "extendUsages",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "useInvalidator",
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
          name: "useInvalidator",
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
          name: "useInvalidator",
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
      name: "useInvalidator",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "usages",
            type: "u64",
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
            name: "useAuthority",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "totalUsages",
            type: {
              option: "u64",
            },
          },
          {
            name: "extensionPaymentAmount",
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
            name: "extensionUsages",
            type: {
              option: "u64",
            },
          },
          {
            name: "maxUsages",
            type: {
              option: "u64",
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
            name: "totalUsages",
            type: {
              option: "u64",
            },
          },
          {
            name: "maxUsages",
            type: {
              option: "u64",
            },
          },
          {
            name: "useAuthority",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "extensionPaymentAmount",
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
            name: "extensionUsages",
            type: {
              option: "u64",
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
      msg: "Token account not owned by the use invalidator",
    },
    {
      code: 6001,
      name: "InvalidPayerTokenAccount",
      msg: "Token account not owned by the issuer",
    },
    {
      code: 6002,
      name: "InvalidTokenAccount",
      msg: "Token account not owned by the issuer",
    },
    {
      code: 6003,
      name: "InvalidUser",
      msg: "User is not permitted to use",
    },
    {
      code: 6004,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this use invalidator",
    },
    {
      code: 6005,
      name: "InsufficientUsages",
      msg: "Usages at the maximum",
    },
    {
      code: 6006,
      name: "InvalidUseInvalidator",
      msg: "Invalid use invalidator",
    },
    {
      code: 6007,
      name: "MaxUsagesReached",
      msg: "Max usages reached",
    },
    {
      code: 6008,
      name: "InvalidExtensionAmount",
      msg: "Extension must be a multiple of extension payment",
    },
    {
      code: 6009,
      name: "InvalidPaymentManagerTokenAccount",
      msg: "Token account incorrect mint",
    },
    {
      code: 6010,
      name: "InvalidCollector",
      msg: "Invalid collector",
    },
  ],
};
