export type CardinalTransferAuthority = {
  version: "4.0.0";
  name: "cardinal_transfer_authority";
  instructions: [
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
      name: "updateTransferAuthority";
      accounts: [
        {
          name: "transferAuthority";
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
            defined: "UpdateTransferAuthorityIx";
          };
        }
      ];
    },
    {
      name: "whitelistMarketplaces";
      accounts: [
        {
          name: "transferAuthority";
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
            defined: "WhitelistMarketplacesIx";
          };
        }
      ];
    },
    {
      name: "release";
      accounts: [
        {
          name: "transferAuthority";
          isMut: false;
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
          name: "tokenManagerTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "holderTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "holder";
          isMut: true;
          isSigner: true;
        },
        {
          name: "collector";
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
          name: "rent";
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
          name: "transferAuthority";
          isMut: false;
          isSigner: false;
        },
        {
          name: "marketplace";
          isMut: false;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mintManager";
          isMut: true;
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
          name: "systemProgram";
          isMut: false;
          isSigner: false;
        },
        {
          name: "instructions";
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
      name: "updateListing";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "listing";
          isMut: true;
          isSigner: false;
        },
        {
          name: "listerMintTokenAccount";
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
          isMut: true;
          isSigner: false;
        },
        {
          name: "listerMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "lister";
          isMut: true;
          isSigner: false;
        },
        {
          name: "buyerMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "buyer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payerPaymentTokenAccount";
          isMut: true;
          isSigner: false;
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
          isMut: false;
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
          isMut: false;
          isSigner: false;
        },
        {
          name: "feeCollectorTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "feeCollector";
          isMut: true;
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
          name: "associatedTokenProgram";
          isMut: false;
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
        },
        {
          name: "instructions";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [
        {
          name: "ix";
          type: {
            defined: "AcceptListingIx";
          };
        }
      ];
    },
    {
      name: "removeListing";
      accounts: [
        {
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "listing";
          isMut: true;
          isSigner: false;
        },
        {
          name: "listerMintTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "lister";
          isMut: true;
          isSigner: true;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "mintManager";
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
        }
      ];
      args: [];
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
          name: "paymentManager";
          isMut: false;
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
    },
    {
      name: "initTransfer";
      accounts: [
        {
          name: "transfer";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "holderTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "holder";
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
            defined: "InitTransferIx";
          };
        }
      ];
    },
    {
      name: "cancelTransfer";
      accounts: [
        {
          name: "transfer";
          isMut: true;
          isSigner: false;
        },
        {
          name: "tokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "holderTokenAccount";
          isMut: false;
          isSigner: false;
        },
        {
          name: "holder";
          isMut: true;
          isSigner: true;
        }
      ];
      args: [];
    },
    {
      name: "acceptTransfer";
      accounts: [
        {
          name: "transfer";
          isMut: true;
          isSigner: false;
        },
        {
          name: "transferAuthority";
          isMut: false;
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
          name: "tokenManager";
          isMut: true;
          isSigner: false;
        },
        {
          name: "mint";
          isMut: false;
          isSigner: false;
        },
        {
          name: "recipientTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "recipient";
          isMut: true;
          isSigner: true;
        },
        {
          name: "payer";
          isMut: true;
          isSigner: true;
        },
        {
          name: "holderTokenAccount";
          isMut: true;
          isSigner: false;
        },
        {
          name: "holder";
          isMut: true;
          isSigner: false;
        },
        {
          name: "cardinalTokenManager";
          isMut: false;
          isSigner: false;
        },
        {
          name: "associatedTokenProgram";
          isMut: false;
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
        },
        {
          name: "rent";
          isMut: false;
          isSigner: false;
        },
        {
          name: "instructions";
          isMut: false;
          isSigner: false;
        }
      ];
      args: [];
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
            type: "string";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "allowedMarketplaces";
            type: {
              option: {
                vec: "publicKey";
              };
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
          },
          {
            name: "paymentMints";
            type: {
              option: {
                vec: "publicKey";
              };
            };
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
    },
    {
      name: "transfer";
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
            name: "from";
            type: "publicKey";
          },
          {
            name: "to";
            type: "publicKey";
          }
        ];
      };
    }
  ];
  types: [
    {
      name: "AcceptListingIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "paymentAmount";
            type: "u64";
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
      name: "InitMarketplaceIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "name";
            type: "string";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "paymentMints";
            type: {
              option: {
                vec: "publicKey";
              };
            };
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
          },
          {
            name: "paymentMints";
            type: {
              option: {
                vec: "publicKey";
              };
            };
          }
        ];
      };
    },
    {
      name: "InitTransferIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "to";
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
            type: "string";
          },
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "allowedMarketplaces";
            type: {
              option: {
                vec: "publicKey";
              };
            };
          }
        ];
      };
    },
    {
      name: "UpdateTransferAuthorityIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            type: "publicKey";
          },
          {
            name: "allowedMarketplaces";
            type: {
              option: {
                vec: "publicKey";
              };
            };
          }
        ];
      };
    },
    {
      name: "WhitelistMarketplacesIx";
      type: {
        kind: "struct";
        fields: [
          {
            name: "allowedMarketplaces";
            type: {
              vec: "publicKey";
            };
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
    },
    {
      code: 6013;
      name: "InvalidTransferAuthorityAuthority";
      msg: "Invalid transfer authority authority";
    },
    {
      code: 6014;
      name: "InvalidTransferAuthority";
      msg: "Invalid transfer authority";
    },
    {
      code: 6015;
      name: "MarketplaceNotAllowed";
      msg: "Marketplace place not allowed by transfer authority";
    },
    {
      code: 6016;
      name: "InvalidHolder";
      msg: "Invalid token holder";
    },
    {
      code: 6017;
      name: "InvalidHolderMintTokenAccount";
      msg: "Invalid holder token account";
    },
    {
      code: 6018;
      name: "InvalidTransfer";
      msg: "Invalid transfer account";
    },
    {
      code: 6019;
      name: "InvalidRecipient";
      msg: "Invalid recipient";
    },
    {
      code: 6020;
      name: "InvalidRecipientMintTokenAccount";
      msg: "Invalid recipient mint token account";
    },
    {
      code: 6021;
      name: "InvalidDerivation";
      msg: "Invalid derivation";
    },
    {
      code: 6022;
      name: "InstructionsDisallowed";
      msg: "Transaction included disallowed";
    },
    {
      code: 6023;
      name: "TokenNotDelegated";
      msg: "Token must be delegated";
    },
    {
      code: 6024;
      name: "ListingChanged";
      msg: "Listing payment amount or mint has changed";
    },
    {
      code: 6025;
      name: "InvalidRemainingAccountsSize";
      msg: "Invalid remaining accounts size";
    },
    {
      code: 6026;
      name: "InvalidPayerPaymentTokenAccount";
      msg: "Invalid payer payment token account";
    }
  ];
};

export const IDL: CardinalTransferAuthority = {
  version: "4.0.0",
  name: "cardinal_transfer_authority",
  instructions: [
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
      name: "updateTransferAuthority",
      accounts: [
        {
          name: "transferAuthority",
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
            defined: "UpdateTransferAuthorityIx",
          },
        },
      ],
    },
    {
      name: "whitelistMarketplaces",
      accounts: [
        {
          name: "transferAuthority",
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
            defined: "WhitelistMarketplacesIx",
          },
        },
      ],
    },
    {
      name: "release",
      accounts: [
        {
          name: "transferAuthority",
          isMut: false,
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
          name: "tokenManagerTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "holderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "holder",
          isMut: true,
          isSigner: true,
        },
        {
          name: "collector",
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
          name: "rent",
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
          name: "transferAuthority",
          isMut: false,
          isSigner: false,
        },
        {
          name: "marketplace",
          isMut: false,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mintManager",
          isMut: true,
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
          name: "systemProgram",
          isMut: false,
          isSigner: false,
        },
        {
          name: "instructions",
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
      name: "updateListing",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "listing",
          isMut: true,
          isSigner: false,
        },
        {
          name: "listerMintTokenAccount",
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
          isMut: true,
          isSigner: false,
        },
        {
          name: "listerMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lister",
          isMut: true,
          isSigner: false,
        },
        {
          name: "buyerMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "buyer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payerPaymentTokenAccount",
          isMut: true,
          isSigner: false,
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
          isMut: false,
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
          isMut: false,
          isSigner: false,
        },
        {
          name: "feeCollectorTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "feeCollector",
          isMut: true,
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
          name: "associatedTokenProgram",
          isMut: false,
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
        {
          name: "instructions",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [
        {
          name: "ix",
          type: {
            defined: "AcceptListingIx",
          },
        },
      ],
    },
    {
      name: "removeListing",
      accounts: [
        {
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "listing",
          isMut: true,
          isSigner: false,
        },
        {
          name: "listerMintTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "lister",
          isMut: true,
          isSigner: true,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "mintManager",
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
      ],
      args: [],
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
          name: "paymentManager",
          isMut: false,
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
    {
      name: "initTransfer",
      accounts: [
        {
          name: "transfer",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "holderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "holder",
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
            defined: "InitTransferIx",
          },
        },
      ],
    },
    {
      name: "cancelTransfer",
      accounts: [
        {
          name: "transfer",
          isMut: true,
          isSigner: false,
        },
        {
          name: "tokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "holderTokenAccount",
          isMut: false,
          isSigner: false,
        },
        {
          name: "holder",
          isMut: true,
          isSigner: true,
        },
      ],
      args: [],
    },
    {
      name: "acceptTransfer",
      accounts: [
        {
          name: "transfer",
          isMut: true,
          isSigner: false,
        },
        {
          name: "transferAuthority",
          isMut: false,
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
          name: "tokenManager",
          isMut: true,
          isSigner: false,
        },
        {
          name: "mint",
          isMut: false,
          isSigner: false,
        },
        {
          name: "recipientTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "recipient",
          isMut: true,
          isSigner: true,
        },
        {
          name: "payer",
          isMut: true,
          isSigner: true,
        },
        {
          name: "holderTokenAccount",
          isMut: true,
          isSigner: false,
        },
        {
          name: "holder",
          isMut: true,
          isSigner: false,
        },
        {
          name: "cardinalTokenManager",
          isMut: false,
          isSigner: false,
        },
        {
          name: "associatedTokenProgram",
          isMut: false,
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
        {
          name: "rent",
          isMut: false,
          isSigner: false,
        },
        {
          name: "instructions",
          isMut: false,
          isSigner: false,
        },
      ],
      args: [],
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
            type: "string",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "allowedMarketplaces",
            type: {
              option: {
                vec: "publicKey",
              },
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
          {
            name: "paymentMints",
            type: {
              option: {
                vec: "publicKey",
              },
            },
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
    {
      name: "transfer",
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
            name: "from",
            type: "publicKey",
          },
          {
            name: "to",
            type: "publicKey",
          },
        ],
      },
    },
  ],
  types: [
    {
      name: "AcceptListingIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "paymentAmount",
            type: "u64",
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
      name: "InitMarketplaceIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "name",
            type: "string",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "paymentMints",
            type: {
              option: {
                vec: "publicKey",
              },
            },
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
          {
            name: "paymentMints",
            type: {
              option: {
                vec: "publicKey",
              },
            },
          },
        ],
      },
    },
    {
      name: "InitTransferIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "to",
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
            type: "string",
          },
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "allowedMarketplaces",
            type: {
              option: {
                vec: "publicKey",
              },
            },
          },
        ],
      },
    },
    {
      name: "UpdateTransferAuthorityIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey",
          },
          {
            name: "allowedMarketplaces",
            type: {
              option: {
                vec: "publicKey",
              },
            },
          },
        ],
      },
    },
    {
      name: "WhitelistMarketplacesIx",
      type: {
        kind: "struct",
        fields: [
          {
            name: "allowedMarketplaces",
            type: {
              vec: "publicKey",
            },
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
    {
      code: 6013,
      name: "InvalidTransferAuthorityAuthority",
      msg: "Invalid transfer authority authority",
    },
    {
      code: 6014,
      name: "InvalidTransferAuthority",
      msg: "Invalid transfer authority",
    },
    {
      code: 6015,
      name: "MarketplaceNotAllowed",
      msg: "Marketplace place not allowed by transfer authority",
    },
    {
      code: 6016,
      name: "InvalidHolder",
      msg: "Invalid token holder",
    },
    {
      code: 6017,
      name: "InvalidHolderMintTokenAccount",
      msg: "Invalid holder token account",
    },
    {
      code: 6018,
      name: "InvalidTransfer",
      msg: "Invalid transfer account",
    },
    {
      code: 6019,
      name: "InvalidRecipient",
      msg: "Invalid recipient",
    },
    {
      code: 6020,
      name: "InvalidRecipientMintTokenAccount",
      msg: "Invalid recipient mint token account",
    },
    {
      code: 6021,
      name: "InvalidDerivation",
      msg: "Invalid derivation",
    },
    {
      code: 6022,
      name: "InstructionsDisallowed",
      msg: "Transaction included disallowed",
    },
    {
      code: 6023,
      name: "TokenNotDelegated",
      msg: "Token must be delegated",
    },
    {
      code: 6024,
      name: "ListingChanged",
      msg: "Listing payment amount or mint has changed",
    },
    {
      code: 6025,
      name: "InvalidRemainingAccountsSize",
      msg: "Invalid remaining accounts size",
    },
    {
      code: 6026,
      name: "InvalidPayerPaymentTokenAccount",
      msg: "Invalid payer payment token account",
    },
  ],
};
