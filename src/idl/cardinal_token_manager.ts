export type CardinalTokenManager = {
  version: "0.0.0";
  name: "cardinal_token_manager";
  instructions: [
    {
      name: "init";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "issuerTokenAccount";
          isMut: true;
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
          name: "mint";
          type: "publicKey";
        },
        {
          name: "numInvalidators";
          type: "u8";
        }
      ];
    },
    {
      name: "uninit";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "issuerTokenAccount";
          isMut: true;
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
      name: "initMintCounter";
      accounts: [
        {
          name: "mintCounter";
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
          name: "bump";
          type: "u8";
        },
        {
          name: "mint";
          type: "publicKey";
        }
      ];
    },
    {
      name: "setPaymentMint";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "paymentMint";
          type: "publicKey";
        }
      ];
    },
    {
      name: "setClaimApprover";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "claimApprover";
          type: "publicKey";
        }
      ];
    },
    {
      name: "setTransferAuthority";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "transferAuthority";
          type: "publicKey";
        }
      ];
    },
    {
      name: "addInvalidator";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "invalidator";
          type: "publicKey";
        }
      ];
    },
    {
      name: "createClaimReceipt";
      accounts: [
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "claimApprover";
          isMut: false;
          isSigner: true;
        },
        {
          name: "claimReceipt";
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
          name: "bump";
          type: "u8";
        },
        {
          name: "target";
          type: "publicKey";
        }
      ];
    },
    {
      name: "createTransferReceipt";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "transferAuthority";
          isMut: true;
          isSigner: true;
        },
        {
          name: "transferReceipt";
          isMut: true;
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
          name: "target";
          type: "publicKey";
        }
      ];
    },
    {
      name: "issue";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "issuerTokenAccount";
          isMut: true;
          isSigner: false;
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
          name: "ix";
          type: {
            defined: "IssueIx";
          };
        }
      ];
    },
    {
      name: "unissue";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "issuer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "issuerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "claim";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "recipient";
          isMut: true;
          isSigner: true;
        },
        {
          name: "recipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
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
          name: "invalidator";
          isMut: true;
          isSigner: true;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
    },
    {
      name: "createMintManager";
      accounts: [
        {
          name: "mintManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "freezeAuthority";
          isMut: false;
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
        }
      ];
    },
    {
      name: "closeMintManager";
      accounts: [
        {
          name: "mintManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "freezeAuthority";
          isMut: false;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: false;
          isSigner: true;
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
      name: "tokenManager";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "count";
            type: "u64";
          },
          {
            name: "numInvalidators";
            type: "u8";
          },
          {
            name: "issuer";
            type: "publicKey";
          },
          {
            name: "mint";
            type: "publicKey";
          },
          {
            name: "amount";
            type: "u64";
          },
          {
            name: "kind";
            type: "u8";
          },
          {
            name: "state";
            type: "u8";
          },
          {
            name: "invalidationType";
            type: "u8";
          },
          {
            name: "recipientTokenAccount";
            type: "publicKey";
          },
          {
            name: "paymentMint";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "claimApprover";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "transferAuthority";
            type: {
              option: "publicKey";
            };
          },
          {
            name: "invalidators";
            type: {
              vec: "publicKey";
            };
          }
        ];
      };
    },
    {
      name: "mintManager";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "initializer";
            type: "publicKey";
          },
          {
            name: "tokenManagers";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "mintCounter";
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
            name: "count";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "claimReceipt";
      type: {
        kind: "struct";
        fields: [];
      };
    },
    {
      name: "tranferReceipt";
      type: {
        kind: "struct";
        fields: [];
      };
    }
  ];
  types: [
    {
      name: "IssueIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "amount";
            type: "u64";
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
      };
    },
    {
      name: "TokenManagerState";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Initialized";
          },
          {
            name: "Issued";
          },
          {
            name: "Claimed";
          },
          {
            name: "Invalidated";
          }
        ];
      };
    },
    {
      name: "TokenManagerKind";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Managed";
          },
          {
            name: "Unmanaged";
          },
          {
            name: "Edition";
          }
        ];
      };
    },
    {
      name: "InvalidationType";
      type: {
        kind: "enum";
        variants: [
          {
            name: "Return";
          },
          {
            name: "Invalidate";
          },
          {
            name: "Release";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 300;
      name: "Uninitialized";
      msg: "Account not initialized";
    },
    {
      code: 301;
      name: "TooManyInvalidators";
      msg: "Too many invalidators have already been added";
    },
    {
      code: 302;
      name: "InvalidTokenManagerTokenAccount";
      msg: "Token account not owned by token manager";
    },
    {
      code: 303;
      name: "InvalidIssuerTokenAccount";
      msg: "Token account not owned by issuer";
    },
    {
      code: 304;
      name: "InvalidRecipientTokenAccount";
      msg: "Token account not owned by recipient";
    },
    {
      code: 305;
      name: "InvalidInvalidatorTokenAccount";
      msg: "Token account not owned by invalidator";
    },
    {
      code: 306;
      name: "InvalidTokenManagerKind";
      msg: "Token manager kind is not valid";
    },
    {
      code: 307;
      name: "InvalidInvalidationType";
      msg: "Invalid invalidation type";
    },
    {
      code: 308;
      name: "InvalidClaimAuthority";
      msg: "Invalid claim authority";
    },
    {
      code: 309;
      name: "InvalidTransferAuthority";
      msg: "Invalid transfer authority";
    },
    {
      code: 310;
      name: "InvalidPaymentManager";
      msg: "Invalid payment manager";
    },
    {
      code: 311;
      name: "InvalidIssuer";
      msg: "Invalid issuer";
    },
    {
      code: 312;
      name: "InvalidInvalidator";
      msg: "Invalid invalidator";
    },
    {
      code: 313;
      name: "InvalidMint";
      msg: "Invalid mint";
    },
    {
      code: 314;
      name: "InvalidTokenManagerState";
      msg: "Invalid token manager state";
    },
    {
      code: 315;
      name: "OutstandingTokens";
      msg: "Outstanding tokens exist";
    },
    {
      code: 316;
      name: "InvalidFreezeAuthority";
      msg: "Invalid freeze authority";
    }
  ];
};

export const IDL: CardinalTokenManager = {
  version: "0.0.0",
  name: "cardinal_token_manager",
  instructions: [
    {
      name: "init",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "issuerTokenAccount",
          isMut: true,
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
          name: "mint",
          type: "publicKey",
        },
        {
          name: "numInvalidators",
          type: "u8",
        },
      ],
    },
    {
      name: "uninit",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "issuerTokenAccount",
          isMut: true,
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
      name: "initMintCounter",
      accounts: [
        {
          name: "mintCounter",
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
          name: "bump",
          type: "u8",
        },
        {
          name: "mint",
          type: "publicKey",
        },
      ],
    },
    {
      name: "setPaymentMint",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "paymentMint",
          type: "publicKey",
        },
      ],
    },
    {
      name: "setClaimApprover",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "claimApprover",
          type: "publicKey",
        },
      ],
    },
    {
      name: "setTransferAuthority",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "transferAuthority",
          type: "publicKey",
        },
      ],
    },
    {
      name: "addInvalidator",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "invalidator",
          type: "publicKey",
        },
      ],
    },
    {
      name: "createClaimReceipt",
      accounts: [
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "claimApprover",
          isMut: false,
          isSigner: true,
        },
        {
          name: "claimReceipt",
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
          name: "bump",
          type: "u8",
        },
        {
          name: "target",
          type: "publicKey",
        },
      ],
    },
    {
      name: "createTransferReceipt",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "transferAuthority",
          isMut: true,
          isSigner: true,
        },
        {
          name: "transferReceipt",
          isMut: true,
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
          name: "target",
          type: "publicKey",
        },
      ],
    },
    {
      name: "issue",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "issuerTokenAccount",
          isMut: true,
          isSigner: false,
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
          name: "ix",
          type: {
            defined: "IssueIx",
          },
        },
      ],
    },
    {
      name: "unissue",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "issuer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "issuerTokenAccount",
          isMut: true,
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
    {
      name: "claim",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "recipient",
          isMut: true,
          isSigner: true,
        },
        {
          name: "recipientTokenAccount",
          isMut: true,
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
    {
      name: "invalidate",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
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
          name: "invalidator",
          isMut: true,
          isSigner: true,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "createMintManager",
      accounts: [
        {
          name: "mintManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "freezeAuthority",
          isMut: false,
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
      ],
    },
    {
      name: "closeMintManager",
      accounts: [
        {
          name: "mintManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "freezeAuthority",
          isMut: false,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: false,
          isSigner: true,
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
      name: "tokenManager",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "count",
            type: "u64",
          },
          {
            name: "numInvalidators",
            type: "u8",
          },
          {
            name: "issuer",
            type: "publicKey",
          },
          {
            name: "mint",
            type: "publicKey",
          },
          {
            name: "amount",
            type: "u64",
          },
          {
            name: "kind",
            type: "u8",
          },
          {
            name: "state",
            type: "u8",
          },
          {
            name: "invalidationType",
            type: "u8",
          },
          {
            name: "recipientTokenAccount",
            type: "publicKey",
          },
          {
            name: "paymentMint",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "claimApprover",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "transferAuthority",
            type: {
              option: "publicKey",
            },
          },
          {
            name: "invalidators",
            type: {
              vec: "publicKey",
            },
          },
        ],
      },
    },
    {
      name: "mintManager",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "initializer",
            type: "publicKey",
          },
          {
            name: "tokenManagers",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "mintCounter",
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
            name: "count",
            type: "u64",
          },
        ],
      },
    },
    {
      name: "claimReceipt",
      type: {
        kind: "struct",
        fields: [],
      },
    },
    {
      name: "tranferReceipt",
      type: {
        kind: "struct",
        fields: [],
      },
    },
  ],
  types: [
    {
      name: "IssueIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "amount",
            type: "u64",
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
    },
    {
      name: "TokenManagerState",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Initialized",
          },
          {
            name: "Issued",
          },
          {
            name: "Claimed",
          },
          {
            name: "Invalidated",
          },
        ],
      },
    },
    {
      name: "TokenManagerKind",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Managed",
          },
          {
            name: "Unmanaged",
          },
          {
            name: "Edition",
          },
        ],
      },
    },
    {
      name: "InvalidationType",
      type: {
        kind: "enum",
        variants: [
          {
            name: "Return",
          },
          {
            name: "Invalidate",
          },
          {
            name: "Release",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 300,
      name: "Uninitialized",
      msg: "Account not initialized",
    },
    {
      code: 301,
      name: "TooManyInvalidators",
      msg: "Too many invalidators have already been added",
    },
    {
      code: 302,
      name: "InvalidTokenManagerTokenAccount",
      msg: "Token account not owned by token manager",
    },
    {
      code: 303,
      name: "InvalidIssuerTokenAccount",
      msg: "Token account not owned by issuer",
    },
    {
      code: 304,
      name: "InvalidRecipientTokenAccount",
      msg: "Token account not owned by recipient",
    },
    {
      code: 305,
      name: "InvalidInvalidatorTokenAccount",
      msg: "Token account not owned by invalidator",
    },
    {
      code: 306,
      name: "InvalidTokenManagerKind",
      msg: "Token manager kind is not valid",
    },
    {
      code: 307,
      name: "InvalidInvalidationType",
      msg: "Invalid invalidation type",
    },
    {
      code: 308,
      name: "InvalidClaimAuthority",
      msg: "Invalid claim authority",
    },
    {
      code: 309,
      name: "InvalidTransferAuthority",
      msg: "Invalid transfer authority",
    },
    {
      code: 310,
      name: "InvalidPaymentManager",
      msg: "Invalid payment manager",
    },
    {
      code: 311,
      name: "InvalidIssuer",
      msg: "Invalid issuer",
    },
    {
      code: 312,
      name: "InvalidInvalidator",
      msg: "Invalid invalidator",
    },
    {
      code: 313,
      name: "InvalidMint",
      msg: "Invalid mint",
    },
    {
      code: 314,
      name: "InvalidTokenManagerState",
      msg: "Invalid token manager state",
    },
    {
      code: 315,
      name: "OutstandingTokens",
      msg: "Outstanding tokens exist",
    },
    {
      code: 316,
      name: "InvalidFreezeAuthority",
      msg: "Invalid freeze authority",
    },
  ],
};
