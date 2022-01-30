export type CardinalTokenManager = {
  "version": "0.0.0",
  "name": "cardinal_token_manager",
  "instructions": [
    {
      "name": "init",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": "bytes"
        },
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "numInvalidators",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setPaymentManager",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "paymentManager",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "setClaimAuthority",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "claimAuthority",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "setTransferAuthority",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "transferAuthority",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "addInvalidator",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "invalidator",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "issue",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ix",
          "type": {
            "defined": "IssueIx"
          }
        }
      ]
    },
    {
      "name": "unissue",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claim",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipient",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "invalidate",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "invalidator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "tokenManager",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "numInvalidators",
            "type": "u8"
          },
          {
            "name": "issuer",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "state",
            "type": "u8"
          },
          {
            "name": "recipientTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "paymentManager",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "claimAuthority",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "transferAuthority",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "invalidators",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "claimReceipt",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "tranferReceipt",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ],
  "types": [
    {
      "name": "IssueIx",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "kind",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "TokenManagerState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Initialized"
          },
          {
            "name": "Issued"
          },
          {
            "name": "Claimed"
          },
          {
            "name": "Invalidated"
          }
        ]
      }
    },
    {
      "name": "TokenManagerKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Managed"
          },
          {
            "name": "Unmanaged"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 300,
      "name": "TooManyInvalidators",
      "msg": "Too many invalidators have already been added"
    },
    {
      "code": 301,
      "name": "InvalidTokenManagerTokenAccount",
      "msg": "Token account not owned by token manager"
    },
    {
      "code": 302,
      "name": "InvalidIssuerTokenAccount",
      "msg": "Token account not owned by issuer"
    },
    {
      "code": 303,
      "name": "InvalidRecipientTokenAccount",
      "msg": "Token account not owned by recipient"
    },
    {
      "code": 304,
      "name": "InvalidInvalidatorTokenAccount",
      "msg": "Token account not owned by invalidator"
    },
    {
      "code": 305,
      "name": "InvalidTokenManagerKind",
      "msg": "Token manager kind is not valid"
    },
    {
      "code": 306,
      "name": "InvalidIssuer",
      "msg": "Invalid issuer"
    },
    {
      "code": 307,
      "name": "InvalidMint",
      "msg": "Invalid mint"
    }
  ]
};

export const IDL: CardinalTokenManager = {
  "version": "0.0.0",
  "name": "cardinal_token_manager",
  "instructions": [
    {
      "name": "init",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "seed",
          "type": "bytes"
        },
        {
          "name": "bump",
          "type": "u8"
        },
        {
          "name": "numInvalidators",
          "type": "u8"
        }
      ]
    },
    {
      "name": "setPaymentManager",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "paymentManager",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "setClaimAuthority",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "claimAuthority",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "setTransferAuthority",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "transferAuthority",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "addInvalidator",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "invalidator",
          "type": "publicKey"
        }
      ]
    },
    {
      "name": "issue",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "ix",
          "type": {
            "defined": "IssueIx"
          }
        }
      ]
    },
    {
      "name": "unissue",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "claim",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipient",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    },
    {
      "name": "invalidate",
      "accounts": [
        {
          "name": "tokenManager",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "tokenManagerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "mint",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "recipientTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "issuerTokenAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "invalidator",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "tokenManager",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "numInvalidators",
            "type": "u8"
          },
          {
            "name": "issuer",
            "type": "publicKey"
          },
          {
            "name": "mint",
            "type": "publicKey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "kind",
            "type": "u8"
          },
          {
            "name": "state",
            "type": "u8"
          },
          {
            "name": "recipientTokenAccount",
            "type": "publicKey"
          },
          {
            "name": "paymentManager",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "claimAuthority",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "transferAuthority",
            "type": {
              "option": "publicKey"
            }
          },
          {
            "name": "invalidators",
            "type": {
              "vec": "publicKey"
            }
          }
        ]
      }
    },
    {
      "name": "claimReceipt",
      "type": {
        "kind": "struct",
        "fields": []
      }
    },
    {
      "name": "tranferReceipt",
      "type": {
        "kind": "struct",
        "fields": []
      }
    }
  ],
  "types": [
    {
      "name": "IssueIx",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "kind",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "TokenManagerState",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Initialized"
          },
          {
            "name": "Issued"
          },
          {
            "name": "Claimed"
          },
          {
            "name": "Invalidated"
          }
        ]
      }
    },
    {
      "name": "TokenManagerKind",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "Managed"
          },
          {
            "name": "Unmanaged"
          }
        ]
      }
    }
  ],
  "errors": [
    {
      "code": 300,
      "name": "TooManyInvalidators",
      "msg": "Too many invalidators have already been added"
    },
    {
      "code": 301,
      "name": "InvalidTokenManagerTokenAccount",
      "msg": "Token account not owned by token manager"
    },
    {
      "code": 302,
      "name": "InvalidIssuerTokenAccount",
      "msg": "Token account not owned by issuer"
    },
    {
      "code": 303,
      "name": "InvalidRecipientTokenAccount",
      "msg": "Token account not owned by recipient"
    },
    {
      "code": 304,
      "name": "InvalidInvalidatorTokenAccount",
      "msg": "Token account not owned by invalidator"
    },
    {
      "code": 305,
      "name": "InvalidTokenManagerKind",
      "msg": "Token manager kind is not valid"
    },
    {
      "code": 306,
      "name": "InvalidIssuer",
      "msg": "Invalid issuer"
    },
    {
      "code": 307,
      "name": "InvalidMint",
      "msg": "Invalid mint"
    }
  ]
};
