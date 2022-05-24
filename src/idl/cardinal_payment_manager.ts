export type CardinalPaymentManager = {
  version: "1.3.10";
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
          name: "collectorTokenAccount";
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
            name: "collector";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "makerFee";
            type: "u64";
          },
          {
            name: "takerFee";
            type: "u64";
          },
          {
            name: "feeScale";
            type: "u64";
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
            name: "makerFee";
            type: "u64";
          },
          {
            name: "takerFee";
            type: "u64";
          },
          {
            name: "feeScale";
            type: "u64";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidCollector";
      msg: "Invalid collector";
    }
  ];
};

export const IDL: CardinalPaymentManager = {
  version: "1.3.10",
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
          name: "collectorTokenAccount",
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
            name: "collector",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "makerFee",
            type: "u64",
          },
          {
            name: "takerFee",
            type: "u64",
          },
          {
            name: "feeScale",
            type: "u64",
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
            name: "makerFee",
            type: "u64",
          },
          {
            name: "takerFee",
            type: "u64",
          },
          {
            name: "feeScale",
            type: "u64",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidCollector",
      msg: "Invalid collector",
    },
  ],
};
