export type CardinalPaymentManager = {
  version: "1.4.0";
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
    }
  ];
};

export const IDL: CardinalPaymentManager = {
  version: "1.4.0",
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
  ],
};
