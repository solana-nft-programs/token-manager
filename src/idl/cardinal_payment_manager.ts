export type CardinalPaymentManager = {
  version: "1.5.19";
  name: "cardinal_payment_manager";
  instructions: [
    {
      name: "init";
      accounts: [
        {
          name: "paymentManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
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
            defined: "InitIx";
          };
        }
      ];
    },
    {
      name: "managePayment";
      accounts: [
        {
          name: "paymentManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "feeCollectorTokenAccount";
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
          isMut: false;
          isSigner: true;
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
      name: "handlePaymentWithRoyalties";
      accounts: [
        {
          name: "paymentManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "payerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "feeCollectorTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "paymentTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "paymentMint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mintMetadata";
          isMut: false;
          isSigner: false;
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
      args: [
        {
          name: "paymentAmount";
          type: "u64";
        }
      ];
    },
    {
      name: "close";
      accounts: [
        {
          name: "paymentManager";
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
    },
    {
      name: "update";
      accounts: [
        {
          name: "paymentManager";
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
            defined: "UpdateIx";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "paymentManager";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "feeCollector";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "makerFeeBasisPoints";
            type: "u16";
          },
          {
            name: "takerFeeBasisPoints";
            type: "u16";
          },
          {
            name: "name";
            type: "string";
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
            name: "name";
            type: "string";
          },
          {
            name: "feeCollector";
            type: "publicKey";
          },
          {
            name: "makerFeeBasisPoints";
            type: "u16";
          },
          {
            name: "takerFeeBasisPoints";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "UpdateIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "feeCollector";
            type: "publicKey";
          },
          {
            name: "makerFeeBasisPoints";
            type: "u16";
          },
          {
            name: "takerFeeBasisPoints";
            type: "u16";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidFeeCollectorTokenAccount";
      msg: "Invalid fee collector token account";
    },
    {
      code: 6001;
      name: "InvalidAuthority";
      msg: "Invalid authority";
    },
    {
      code: 6002;
      name: "InvalidMintMetadata";
      msg: "Invalid mint metadata";
    },
    {
      code: 6003;
      name: "InvalidCreatorAddress";
      msg: "Invalid creator address";
    },
    {
      code: 6004;
      name: "InvalidTokenAccount";
      msg: "Invalid token account";
    },
    {
      code: 6005;
      name: "InvalidPaymentManager";
      msg: "Invalid payment manager";
    },
    {
      code: 6006;
      name: "InvalidMintMetadataOwner";
      msg: "Mint metadata is owned by the incorrect program";
    }
  ];
};

export const IDL: CardinalPaymentManager = {
  version: "1.5.19",
  name: "cardinal_payment_manager",
  instructions: [
    {
      name: "init",
      accounts: [
        {
          name: "paymentManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
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
            defined: "InitIx",
          },
        },
      ],
    },
    {
      name: "managePayment",
      accounts: [
        {
          name: "paymentManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "feeCollectorTokenAccount",
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
          isMut: false,
          isSigner: true,
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
      name: "handlePaymentWithRoyalties",
      accounts: [
        {
          name: "paymentManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "payerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "feeCollectorTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "paymentTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "paymentMint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mintMetadata",
          isMut: false,
          isSigner: false,
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
      args: [
        {
          name: "paymentAmount",
          type: "u64",
        },
      ],
    },
    {
      name: "close",
      accounts: [
        {
          name: "paymentManager",
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
    {
      name: "update",
      accounts: [
        {
          name: "paymentManager",
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
            defined: "UpdateIx",
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "paymentManager",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "feeCollector",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "makerFeeBasisPoints",
            type: "u16",
          },
          {
            name: "takerFeeBasisPoints",
            type: "u16",
          },
          {
            name: "name",
            type: "string",
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
            name: "name",
            type: "string",
          },
          {
            name: "feeCollector",
            type: "publicKey",
          },
          {
            name: "makerFeeBasisPoints",
            type: "u16",
          },
          {
            name: "takerFeeBasisPoints",
            type: "u16",
          },
        ],
      },
    },
    {
      name: "UpdateIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "feeCollector",
            type: "publicKey",
          },
          {
            name: "makerFeeBasisPoints",
            type: "u16",
          },
          {
            name: "takerFeeBasisPoints",
            type: "u16",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidFeeCollectorTokenAccount",
      msg: "Invalid fee collector token account",
    },
    {
      code: 6001,
      name: "InvalidAuthority",
      msg: "Invalid authority",
    },
    {
      code: 6002,
      name: "InvalidMintMetadata",
      msg: "Invalid mint metadata",
    },
    {
      code: 6003,
      name: "InvalidCreatorAddress",
      msg: "Invalid creator address",
    },
    {
      code: 6004,
      name: "InvalidTokenAccount",
      msg: "Invalid token account",
    },
    {
      code: 6005,
      name: "InvalidPaymentManager",
      msg: "Invalid payment manager",
    },
    {
      code: 6006,
      name: "InvalidMintMetadataOwner",
      msg: "Mint metadata is owned by the incorrect program",
    },
  ],
};
