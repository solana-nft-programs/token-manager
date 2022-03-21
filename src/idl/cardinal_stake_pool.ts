export type CardinalStakePool = {
  version: "0.0.0";
  name: "cardinal_stake_pool";
  instructions: [
    {
      name: "initPool";
      accounts: [
        {
          name: "stakePool";
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
          name: "ix";
          type: {
            defined: "InitPoolIx";
          };
        }
      ];
    },
    {
      name: "initEntry";
      accounts: [
        {
          name: "stakeEntry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakePool";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "originalMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: true;
        },
        {
          name: "mintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintMetadata";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenMetadataProgram";
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
            defined: "InitEntryIx";
          };
        }
      ];
    },
    {
      name: "stake";
      accounts: [
        {
          name: "stakeEntry";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "originalMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakeEntryOriginalMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "stakeEntryTokenManagerMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "user";
          isMut: true;
          isSigner: true;
        },
        {
          name: "userOriginalMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "userTokenManagerMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenManagerProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedToken";
          isMut: false;
          isSigner: false;
        },
        {
          name: "rent";
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
      name: "unstake";
      accounts: [
        {
          name: "stakeEntry";
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
            defined: "UnstakeIx";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "stakeEntry";
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
            name: "originalMint";
            type: "publicKey";
          },
          {
            name: "mint";
            type: "publicKey";
          },
          {
            name: "totalStakeSeconds";
            type: "i64";
          },
          {
            name: "lastStakedAt";
            type: "i64";
          },
          {
            name: "lastStaker";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "stakePool";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "identifier";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "InitEntryIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: "string";
          },
          {
            name: "symbol";
            type: "string";
          },
          {
            name: "textOverlay";
            type: "string";
          }
        ];
      };
    },
    {
      name: "InitPoolIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "identifier";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "UnstakeIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
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
            name: "InvalidOriginalMint";
          },
          {
            name: "InvalidTokenManagerMint";
          },
          {
            name: "InvalidUserOriginalMintTokenAccount";
          },
          {
            name: "InvalidUserTokenManagerMintTokenAccount";
          },
          {
            name: "InvalidStakeEntryOriginalMintTokenAccount";
          },
          {
            name: "InvalidStakeEntryTokenManagerMintTokenAccount";
          }
        ];
      };
    }
  ];
};

export const IDL: CardinalStakePool = {
  version: "0.0.0",
  name: "cardinal_stake_pool",
  instructions: [
    {
      name: "initPool",
      accounts: [
        {
          name: "stakePool",
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
          name: "ix",
          type: {
            defined: "InitPoolIx",
          },
        },
      ],
    },
    {
      name: "initEntry",
      accounts: [
        {
          name: "stakeEntry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakePool",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "originalMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: true,
        },
        {
          name: "mintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintMetadata",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenMetadataProgram",
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
            defined: "InitEntryIx",
          },
        },
      ],
    },
    {
      name: "stake",
      accounts: [
        {
          name: "stakeEntry",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "originalMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakeEntryOriginalMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "stakeEntryTokenManagerMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "user",
          isMut: true,
          isSigner: true,
        },
        {
          name: "userOriginalMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "userTokenManagerMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenManagerProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedToken",
          isMut: false,
          isSigner: false,
        },
        {
          name: "rent",
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
      name: "unstake",
      accounts: [
        {
          name: "stakeEntry",
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
            defined: "UnstakeIx",
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "stakeEntry",
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
            name: "originalMint",
            type: "publicKey",
          },
          {
            name: "mint",
            type: "publicKey",
          },
          {
            name: "totalStakeSeconds",
            type: "i64",
          },
          {
            name: "lastStakedAt",
            type: "i64",
          },
          {
            name: "lastStaker",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "stakePool",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "identifier",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "InitEntryIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "symbol",
            type: "string",
          },
          {
            name: "textOverlay",
            type: "string",
          },
        ],
      },
    },
    {
      name: "InitPoolIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "identifier",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "UnstakeIx",
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
    {
      name: "ErrorCode",
      type: {
        kind: "enum",
        variants: [
          {
            name: "InvalidOriginalMint",
          },
          {
            name: "InvalidTokenManagerMint",
          },
          {
            name: "InvalidUserOriginalMintTokenAccount",
          },
          {
            name: "InvalidUserTokenManagerMintTokenAccount",
          },
          {
            name: "InvalidStakeEntryOriginalMintTokenAccount",
          },
          {
            name: "InvalidStakeEntryTokenManagerMintTokenAccount",
          },
        ],
      },
    },
  ],
};
