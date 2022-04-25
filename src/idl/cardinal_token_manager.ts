export type CardinalTokenManager = {
  version: "1.2.1";
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
          name: "mintCounter";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
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
          name: "ix";
          type: {
            defined: "InitIx";
          };
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
          name: "mint";
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
          name: "target";
          type: "publicKey";
        }
      ];
    },
    {
      name: "claimReceiptMint";
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
          name: "recipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "receiptMintManager";
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
          isMut: false;
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
      args: [];
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
      name: "transfer";
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
          name: "currentHolderTokenAccount";
          isMut: true;
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
          isMut: false;
          isSigner: true;
        },
        {
          name: "collector";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
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
      args: [];
    },
    {
      name: "closeMintManager";
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
            name: "version";
            type: "u8";
          },
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
            name: "stateChangedAt";
            type: "i64";
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
            name: "receiptMint";
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
            name: "mint";
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
        fields: [
          {
            name: "mintCount";
            type: "u64";
          },
          {
            name: "tokenManager";
            type: "publicKey";
          },
          {
            name: "target";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "tranferReceipt";
      type: {
        kind: "struct";
        fields: [
          {
            name: "mintCount";
            type: "u64";
          },
          {
            name: "tokenManager";
            type: "publicKey";
          },
          {
            name: "target";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "receiptMintManager";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
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
          },
          {
            name: "numInvalidators";
            type: "u8";
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
            name: "Uninitialized";
          },
          {
            name: "TooManyInvalidators";
          },
          {
            name: "InvalidNumInvalidators";
          },
          {
            name: "InvalidTokenManagerTokenAccount";
          },
          {
            name: "InvalidIssuerTokenAccount";
          },
          {
            name: "MaximumInvalidatorsReached";
          },
          {
            name: "InvalidRecipientTokenAccount";
          },
          {
            name: "InvalidInvalidatorTokenAccount";
          },
          {
            name: "InvalidTokenManagerKind";
          },
          {
            name: "InvalidInvalidationType";
          },
          {
            name: "InvalidClaimAuthority";
          },
          {
            name: "InvalidTransferAuthority";
          },
          {
            name: "InvalidIssuer";
          },
          {
            name: "InvalidInvalidator";
          },
          {
            name: "InvalidMint";
          },
          {
            name: "InvalidTokenManagerState";
          },
          {
            name: "OutstandingTokens";
          },
          {
            name: "InvalidFreezeAuthority";
          },
          {
            name: "InvalidInitializer";
          },
          {
            name: "InvalidClaimReceipt";
          },
          {
            name: "InvalidTransferReceipt";
          },
          {
            name: "PublicKeyMismatch";
          },
          {
            name: "InvalidMetadataProgramId";
          },
          {
            name: "InvalidReceiptMintAccount";
          },
          {
            name: "InvalidReceiptMintOwner";
          },
          {
            name: "InvalidReceiptMint";
          },
          {
            name: "InvalidCurrentTokenAccount";
          },
          {
            name: "InvalidMintSupply";
          },
          {
            name: "AccountDiscriminatorMismatch";
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
          },
          {
            name: "Reissue";
          }
        ];
      };
    }
  ];
};

export const IDL: CardinalTokenManager = {
  version: "1.2.1",
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
          name: "mintCounter",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
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
          name: "ix",
          type: {
            defined: "InitIx",
          },
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
          name: "mint",
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
          name: "target",
          type: "publicKey",
        },
      ],
    },
    {
      name: "claimReceiptMint",
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
          name: "recipientTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "receiptMintManager",
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
          isMut: false,
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
      args: [],
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
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
    },
    {
      name: "transfer",
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
          name: "currentHolderTokenAccount",
          isMut: true,
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
          isMut: false,
          isSigner: true,
        },
        {
          name: "collector",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
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
      args: [],
    },
    {
      name: "closeMintManager",
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
            name: "version",
            type: "u8",
          },
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
            name: "stateChangedAt",
            type: "i64",
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
            name: "receiptMint",
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
            name: "mint",
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
        fields: [
          {
            name: "mintCount",
            type: "u64",
          },
          {
            name: "tokenManager",
            type: "publicKey",
          },
          {
            name: "target",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "tranferReceipt",
      type: {
        kind: "struct",
        fields: [
          {
            name: "mintCount",
            type: "u64",
          },
          {
            name: "tokenManager",
            type: "publicKey",
          },
          {
            name: "target",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "receiptMintManager",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
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
          {
            name: "numInvalidators",
            type: "u8",
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
            name: "Uninitialized",
          },
          {
            name: "TooManyInvalidators",
          },
          {
            name: "InvalidNumInvalidators",
          },
          {
            name: "InvalidTokenManagerTokenAccount",
          },
          {
            name: "InvalidIssuerTokenAccount",
          },
          {
            name: "MaximumInvalidatorsReached",
          },
          {
            name: "InvalidRecipientTokenAccount",
          },
          {
            name: "InvalidInvalidatorTokenAccount",
          },
          {
            name: "InvalidTokenManagerKind",
          },
          {
            name: "InvalidInvalidationType",
          },
          {
            name: "InvalidClaimAuthority",
          },
          {
            name: "InvalidTransferAuthority",
          },
          {
            name: "InvalidIssuer",
          },
          {
            name: "InvalidInvalidator",
          },
          {
            name: "InvalidMint",
          },
          {
            name: "InvalidTokenManagerState",
          },
          {
            name: "OutstandingTokens",
          },
          {
            name: "InvalidFreezeAuthority",
          },
          {
            name: "InvalidInitializer",
          },
          {
            name: "InvalidClaimReceipt",
          },
          {
            name: "InvalidTransferReceipt",
          },
          {
            name: "PublicKeyMismatch",
          },
          {
            name: "InvalidMetadataProgramId",
          },
          {
            name: "InvalidReceiptMintAccount",
          },
          {
            name: "InvalidReceiptMintOwner",
          },
          {
            name: "InvalidReceiptMint",
          },
          {
            name: "InvalidCurrentTokenAccount",
          },
          {
            name: "InvalidMintSupply",
          },
          {
            name: "AccountDiscriminatorMismatch",
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
          {
            name: "Reissue",
          },
        ],
      },
    },
  ],
};
