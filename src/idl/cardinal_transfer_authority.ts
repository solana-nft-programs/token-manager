export type CardinalPaidTransferAuthority = {
  version: "1.5.12";
  name: "cardinal_paid_transfer_authority";
  instructions: [
    {
      name: "acceptListing";
      accounts: [
        {
          name: "transferAuthority";
          isMut: true;
          isSigner: false;
        },
        {
          name: "transferReceipt";
          isMut: true;
          isSigner: false;
        },
        {
          name: "listing";
          isMut: true;
          isSigner: false;
        },
        {
          name: "listerPaymentTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "listerMintTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "lister";
          isMut: true;
          isSigner: false;
        },
        {
          name: "buyerPaymentTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "buyerMintTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "buyer";
          isMut: false;
          isSigner: true;
        },
        {
          name: "marketplace";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mintMetadataInfo";
          isMut: false;
          isSigner: false;
        },
        {
          name: "paymentManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "paymentMint";
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
          isMut: false;
          isSigner: true;
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
        },
        {
          name: "cardinalTokenManager";
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
      name: "createListing";
      accounts: [
        {
          name: "listing";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marketplace";
          isMut: false;
          isSigner: false;
        },
        {
          name: "listerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "lister";
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
            defined: "CreateListingIx";
          };
        }
      ];
    },
    {
      name: "initMarketplace";
      accounts: [
        {
          name: "marketplace";
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
            defined: "InitMarketplaceIx";
          };
        }
      ];
    },
    {
      name: "initTransferAuthority";
      accounts: [
        {
          name: "transferAuthority";
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
            defined: "InitTransferAuthorityIx";
          };
        }
      ];
    },
    {
      name: "removeListing";
      accounts: [
        {
          name: "listing";
          isMut: true;
          isSigner: false;
        },
        {
          name: "lister";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [];
    },
    {
      name: "updateListing";
      accounts: [
        {
          name: "listing";
          isMut: true;
          isSigner: false;
        },
        {
          name: "lister";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "UpdateListingIx";
          };
        }
      ];
    },
    {
      name: "updateMarketplace";
      accounts: [
        {
          name: "marketplace";
          isMut: true;
          isSigner: false;
        },
        {
          name: "authority";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "UpdateMarketplaceIx";
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "transferAuthority";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "name";
            type: {
              option: "string";
            };
          },
          {
            name: "marketplace";
            type: {
              option: "publicKey";
            };
          }
        ];
      };
    },
    {
      name: "marketplace";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "name";
            type: "string";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "listing";
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            type: "u8";
          },
          {
            name: "lister";
            type: "publicKey";
          },
          {
            name: "tokenManager";
            type: "publicKey";
          },
          {
            name: "marketplace";
            type: "publicKey";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "AcceptListingCtx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "transferAuthority";
            type: {
              defined: "Box<Account<'info,TransferAuthority>>";
            };
          },
          {
            name: "transferReceipt";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "listing";
            type: {
              defined: "Box<Account<'info,Listing>>";
            };
          },
          {
            name: "listerPaymentTokenAccount";
            type: {
              defined: "Box<Account<'info,TokenAccount>>";
            };
          },
          {
            name: "listerMintTokenAccount";
            type: {
              defined: "Box<Account<'info,TokenAccount>>";
            };
          },
          {
            name: "lister";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "buyerPaymentTokenAccount";
            type: {
              defined: "Box<Account<'info,TokenAccount>>";
            };
          },
          {
            name: "buyerMintTokenAccount";
            type: {
              defined: "Box<Account<'info,TokenAccount>>";
            };
          },
          {
            name: "buyer";
            type: {
              defined: "Signer<'info>";
            };
          },
          {
            name: "marketplace";
            type: {
              defined: "Box<Account<'info,Marketplace>>";
            };
          },
          {
            name: "tokenManager";
            type: {
              defined: "Box<Account<'info,TokenManager>>";
            };
          },
          {
            name: "mint";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "mintMetadataInfo";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "paymentManager";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "paymentMint";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "feeCollectorTokenAccount";
            type: {
              defined: "UncheckedAccount<'info>";
            };
          },
          {
            name: "payer";
            type: {
              defined: "Signer<'info>";
            };
          },
          {
            name: "tokenProgram";
            type: {
              defined: "Program<'info,Token>";
            };
          },
          {
            name: "cardinalPaymentManager";
            type: {
              defined: "Program<'info,CardinalPaymentManager>";
            };
          },
          {
            name: "cardinalTokenManager";
            type: {
              defined: "Program<'info,CardinalTokenManager>";
            };
          },
          {
            name: "systemProgram";
            type: {
              defined: "Program<'info,System>";
            };
          }
        ];
      };
    },
    {
      name: "CreateListingIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "collector";
            type: "publicKey";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "InitMarketplaceIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: "string";
          },
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "InitTransferAuthorityIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: {
              option: "string";
            };
          },
          {
            name: "marketplace";
            type: {
              option: "publicKey";
            };
          }
        ];
      };
    },
    {
      name: "UpdateListingIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "marketplace";
            type: "publicKey";
          },
          {
            name: "paymentAmount";
            type: "u64";
          },
          {
            name: "paymentMint";
            type: "publicKey";
          }
        ];
      };
    },
    {
      name: "UpdateMarketplaceIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "paymentManager";
            type: "publicKey";
          },
          {
            name: "authority";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  errors: [
    {
      code: 6000;
      name: "InvalidTokenManager";
      msg: "Invalid token manager for this transfer authority";
    },
    {
      code: 6001;
      name: "InvalidLister";
      msg: "Invalid lister";
    },
    {
      code: 6002;
      name: "InvalidPaymentMint";
      msg: "Invalid payment mint";
    },
    {
      code: 6003;
      name: "InvalidMarketplace";
      msg: "Invalid marketplace";
    },
    {
      code: 6004;
      name: "InvalidBuyerPaymentTokenAccount";
      msg: "Invalid buyer payment token account";
    },
    {
      code: 6005;
      name: "InvalidBuyerMintTokenAccount";
      msg: "Invalid buyer mint token account";
    },
    {
      code: 6006;
      name: "InvalidOfferTokenAccount";
      msg: "Invalid offer token account";
    },
    {
      code: 6007;
      name: "InvalidPaymentManager";
      msg: "Invalid payment manager";
    },
    {
      code: 6008;
      name: "InvalidMint";
      msg: "Invalid mint";
    },
    {
      code: 6009;
      name: "InvalidFeeCollector";
      msg: "Invalid fee collector";
    },
    {
      code: 6010;
      name: "InvalidListerPaymentTokenAccount";
      msg: "Invalid lister payment token account";
    },
    {
      code: 6011;
      name: "InvalidListerMintTokenAccount";
      msg: "Invalid lister mint token account";
    },
    {
      code: 6012;
      name: "InvalidMarketplaceAuthority";
      msg: "Invalid marketplace authority";
    }
  ];
};

export const IDL: CardinalPaidTransferAuthority = {
  version: "1.5.12",
  name: "cardinal_paid_transfer_authority",
  instructions: [
    {
      name: "acceptListing",
      accounts: [
        {
          name: "transferAuthority",
          isMut: true,
          isSigner: false,
        },
        {
          name: "transferReceipt",
          isMut: true,
          isSigner: false,
        },
        {
          name: "listing",
          isMut: true,
          isSigner: false,
        },
        {
          name: "listerPaymentTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "listerMintTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "lister",
          isMut: true,
          isSigner: false,
        },
        {
          name: "buyerPaymentTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "buyerMintTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "buyer",
          isMut: false,
          isSigner: true,
        },
        {
          name: "marketplace",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mintMetadataInfo",
          isMut: false,
          isSigner: false,
        },
        {
          name: "paymentManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "paymentMint",
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
          isMut: false,
          isSigner: true,
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
        {
          name: "cardinalTokenManager",
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
      name: "createListing",
      accounts: [
        {
          name: "listing",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marketplace",
          isMut: false,
          isSigner: false,
        },
        {
          name: "listerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lister",
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
            defined: "CreateListingIx",
          },
        },
      ],
    },
    {
      name: "initMarketplace",
      accounts: [
        {
          name: "marketplace",
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
            defined: "InitMarketplaceIx",
          },
        },
      ],
    },
    {
      name: "initTransferAuthority",
      accounts: [
        {
          name: "transferAuthority",
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
            defined: "InitTransferAuthorityIx",
          },
        },
      ],
    },
    {
      name: "removeListing",
      accounts: [
        {
          name: "listing",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lister",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: "updateListing",
      accounts: [
        {
          name: "listing",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lister",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "UpdateListingIx",
          },
        },
      ],
    },
    {
      name: "updateMarketplace",
      accounts: [
        {
          name: "marketplace",
          isMut: true,
          isSigner: false,
        },
        {
          name: "authority",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "UpdateMarketplaceIx",
          },
        },
      ],
    },
  ],
  accounts: [
    {
      name: "transferAuthority",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "name",
            type: {
              option: "string",
            },
          },
          {
            name: "marketplace",
            type: {
              option: "publicKey",
            },
          },
        ],
      },
    },
    {
      name: "marketplace",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "name",
            type: "string",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "listing",
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            type: "u8",
          },
          {
            name: "lister",
            type: "publicKey",
          },
          {
            name: "tokenManager",
            type: "publicKey",
          },
          {
            name: "marketplace",
            type: "publicKey",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "AcceptListingCtx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "transferAuthority",
            type: {
              defined: "Box<Account<'info,TransferAuthority>>",
            },
          },
          {
            name: "transferReceipt",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "listing",
            type: {
              defined: "Box<Account<'info,Listing>>",
            },
          },
          {
            name: "listerPaymentTokenAccount",
            type: {
              defined: "Box<Account<'info,TokenAccount>>",
            },
          },
          {
            name: "listerMintTokenAccount",
            type: {
              defined: "Box<Account<'info,TokenAccount>>",
            },
          },
          {
            name: "lister",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "buyerPaymentTokenAccount",
            type: {
              defined: "Box<Account<'info,TokenAccount>>",
            },
          },
          {
            name: "buyerMintTokenAccount",
            type: {
              defined: "Box<Account<'info,TokenAccount>>",
            },
          },
          {
            name: "buyer",
            type: {
              defined: "Signer<'info>",
            },
          },
          {
            name: "marketplace",
            type: {
              defined: "Box<Account<'info,Marketplace>>",
            },
          },
          {
            name: "tokenManager",
            type: {
              defined: "Box<Account<'info,TokenManager>>",
            },
          },
          {
            name: "mint",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "mintMetadataInfo",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "paymentManager",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "paymentMint",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "feeCollectorTokenAccount",
            type: {
              defined: "UncheckedAccount<'info>",
            },
          },
          {
            name: "payer",
            type: {
              defined: "Signer<'info>",
            },
          },
          {
            name: "tokenProgram",
            type: {
              defined: "Program<'info,Token>",
            },
          },
          {
            name: "cardinalPaymentManager",
            type: {
              defined: "Program<'info,CardinalPaymentManager>",
            },
          },
          {
            name: "cardinalTokenManager",
            type: {
              defined: "Program<'info,CardinalTokenManager>",
            },
          },
          {
            name: "systemProgram",
            type: {
              defined: "Program<'info,System>",
            },
          },
        ],
      },
    },
    {
      name: "CreateListingIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "collector",
            type: "publicKey",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "InitMarketplaceIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "InitTransferAuthorityIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: {
              option: "string",
            },
          },
          {
            name: "marketplace",
            type: {
              option: "publicKey",
            },
          },
        ],
      },
    },
    {
      name: "UpdateListingIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "marketplace",
            type: "publicKey",
          },
          {
            name: "paymentAmount",
            type: "u64",
          },
          {
            name: "paymentMint",
            type: "publicKey",
          },
        ],
      },
    },
    {
      name: "UpdateMarketplaceIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "paymentManager",
            type: "publicKey",
          },
          {
            name: "authority",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  errors: [
    {
      code: 6000,
      name: "InvalidTokenManager",
      msg: "Invalid token manager for this transfer authority",
    },
    {
      code: 6001,
      name: "InvalidLister",
      msg: "Invalid lister",
    },
    {
      code: 6002,
      name: "InvalidPaymentMint",
      msg: "Invalid payment mint",
    },
    {
      code: 6003,
      name: "InvalidMarketplace",
      msg: "Invalid marketplace",
    },
    {
      code: 6004,
      name: "InvalidBuyerPaymentTokenAccount",
      msg: "Invalid buyer payment token account",
    },
    {
      code: 6005,
      name: "InvalidBuyerMintTokenAccount",
      msg: "Invalid buyer mint token account",
    },
    {
      code: 6006,
      name: "InvalidOfferTokenAccount",
      msg: "Invalid offer token account",
    },
    {
      code: 6007,
      name: "InvalidPaymentManager",
      msg: "Invalid payment manager",
    },
    {
      code: 6008,
      name: "InvalidMint",
      msg: "Invalid mint",
    },
    {
      code: 6009,
      name: "InvalidFeeCollector",
      msg: "Invalid fee collector",
    },
    {
      code: 6010,
      name: "InvalidListerPaymentTokenAccount",
      msg: "Invalid lister payment token account",
    },
    {
      code: 6011,
      name: "InvalidListerMintTokenAccount",
      msg: "Invalid lister mint token account",
    },
    {
      code: 6012,
      name: "InvalidMarketplaceAuthority",
      msg: "Invalid marketplace authority",
    },
  ],
};
