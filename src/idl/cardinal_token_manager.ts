export type CardinalTokenManager = {
  version: "1.3.9";
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
  errors: [
    {
      code: 6000;
      name: "Uninitialized";
      msg: "Account not initialized";
    },
    {
      code: 6001;
      name: "TooManyInvalidators";
      msg: "Too many invalidators have already been added";
    },
    {
      code: 6002;
      name: "InvalidNumInvalidators";
      msg: "Number of invalidators cannot be overwritten";
    },
    {
      code: 6003;
      name: "InvalidTokenManagerTokenAccount";
      msg: "Token account not owned by token manager";
    },
    {
      code: 6004;
      name: "InvalidIssuerTokenAccount";
      msg: "Token account not owned by issuer";
    },
    {
      code: 6005;
      name: "MaximumInvalidatorsReached";
      msg: "Max invalidators reached";
    },
    {
      code: 6006;
      name: "InvalidRecipientTokenAccount";
      msg: "Token account not owned by recipient";
    },
    {
      code: 6007;
      name: "InvalidInvalidatorTokenAccount";
      msg: "Token account not owned by invalidator";
    },
    {
      code: 6008;
      name: "InvalidTokenManagerKind";
      msg: "Token manager kind is not valid";
    },
    {
      code: 6009;
      name: "InvalidInvalidationType";
      msg: "Invalid invalidation type";
    },
    {
      code: 6010;
      name: "InvalidClaimAuthority";
      msg: "Invalid claim authority";
    },
    {
      code: 6011;
      name: "InvalidTransferAuthority";
      msg: "Invalid transfer authority";
    },
    {
      code: 6012;
      name: "InvalidIssuer";
      msg: "Invalid issuer";
    },
    {
      code: 6013;
      name: "InvalidInvalidator";
      msg: "Invalid invalidator";
    },
    {
      code: 6014;
      name: "InvalidMint";
      msg: "Invalid mint";
    },
    {
      code: 6015;
      name: "InvalidTokenManagerState";
      msg: "Invalid token manager state";
    },
    {
      code: 6016;
      name: "OutstandingTokens";
      msg: "Outstanding tokens exist";
    },
    {
      code: 6017;
      name: "InvalidFreezeAuthority";
      msg: "User must be freeze authority to create mint manager";
    },
    {
      code: 6018;
      name: "InvalidInitializer";
      msg: "User must be initializer to close mint manager";
    },
    {
      code: 6019;
      name: "InvalidClaimReceipt";
      msg: "Invalid claim receipt";
    },
    {
      code: 6020;
      name: "InvalidTransferReceipt";
      msg: "Invalid transfer receipt";
    },
    {
      code: 6021;
      name: "PublicKeyMismatch";
      msg: "Public key mismatch";
    },
    {
      code: 6022;
      name: "InvalidMetadataProgramId";
      msg: "Invalid metadata program id";
    },
    {
      code: 6023;
      name: "InvalidReceiptMintAccount";
      msg: "Invalid receipt mint account";
    },
    {
      code: 6024;
      name: "InvalidReceiptMintOwner";
      msg: "Invalid receipt mint owner";
    },
    {
      code: 6025;
      name: "InvalidReceiptMint";
      msg: "Invalid receipt mint";
    },
    {
      code: 6026;
      name: "InvalidCurrentTokenAccount";
      msg: "Invalid current holder token account";
    },
    {
      code: 6027;
      name: "InvalidMintSupply";
      msg: "Invalid mint supply";
    },
    {
      code: 6028;
      name: "AccountDiscriminatorMismatch";
      msg: "Invalid account discriminator";
    }
  ];
};

export const IDL: CardinalTokenManager = {
  version: "1.3.9",
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
  errors: [
    {
      code: 6000,
      name: "Uninitialized",
      msg: "Account not initialized",
    },
    {
      code: 6001,
      name: "TooManyInvalidators",
      msg: "Too many invalidators have already been added",
    },
    {
      code: 6002,
      name: "InvalidNumInvalidators",
      msg: "Number of invalidators cannot be overwritten",
    },
    {
      code: 6003,
      name: "InvalidTokenManagerTokenAccount",
      msg: "Token account not owned by token manager",
    },
    {
      code: 6004,
      name: "InvalidIssuerTokenAccount",
      msg: "Token account not owned by issuer",
    },
    {
      code: 6005,
      name: "MaximumInvalidatorsReached",
      msg: "Max invalidators reached",
    },
    {
      code: 6006,
      name: "InvalidRecipientTokenAccount",
      msg: "Token account not owned by recipient",
    },
    {
      code: 6007,
      name: "InvalidInvalidatorTokenAccount",
      msg: "Token account not owned by invalidator",
    },
    {
      code: 6008,
      name: "InvalidTokenManagerKind",
      msg: "Token manager kind is not valid",
    },
    {
      code: 6009,
      name: "InvalidInvalidationType",
      msg: "Invalid invalidation type",
    },
    {
      code: 6010,
      name: "InvalidClaimAuthority",
      msg: "Invalid claim authority",
    },
    {
      code: 6011,
      name: "InvalidTransferAuthority",
      msg: "Invalid transfer authority",
    },
    {
      code: 6012,
      name: "InvalidIssuer",
      msg: "Invalid issuer",
    },
    {
      code: 6013,
      name: "InvalidInvalidator",
      msg: "Invalid invalidator",
    },
    {
      code: 6014,
      name: "InvalidMint",
      msg: "Invalid mint",
    },
    {
      code: 6015,
      name: "InvalidTokenManagerState",
      msg: "Invalid token manager state",
    },
    {
      code: 6016,
      name: "OutstandingTokens",
      msg: "Outstanding tokens exist",
    },
    {
      code: 6017,
      name: "InvalidFreezeAuthority",
      msg: "User must be freeze authority to create mint manager",
    },
    {
      code: 6018,
      name: "InvalidInitializer",
      msg: "User must be initializer to close mint manager",
    },
    {
      code: 6019,
      name: "InvalidClaimReceipt",
      msg: "Invalid claim receipt",
    },
    {
      code: 6020,
      name: "InvalidTransferReceipt",
      msg: "Invalid transfer receipt",
    },
    {
      code: 6021,
      name: "PublicKeyMismatch",
      msg: "Public key mismatch",
    },
    {
      code: 6022,
      name: "InvalidMetadataProgramId",
      msg: "Invalid metadata program id",
    },
    {
      code: 6023,
      name: "InvalidReceiptMintAccount",
      msg: "Invalid receipt mint account",
    },
    {
      code: 6024,
      name: "InvalidReceiptMintOwner",
      msg: "Invalid receipt mint owner",
    },
    {
      code: 6025,
      name: "InvalidReceiptMint",
      msg: "Invalid receipt mint",
    },
    {
      code: 6026,
      name: "InvalidCurrentTokenAccount",
      msg: "Invalid current holder token account",
    },
    {
      code: 6027,
      name: "InvalidMintSupply",
      msg: "Invalid mint supply",
    },
    {
      code: 6028,
      name: "AccountDiscriminatorMismatch",
      msg: "Invalid account discriminator",
    },
  ],
};
