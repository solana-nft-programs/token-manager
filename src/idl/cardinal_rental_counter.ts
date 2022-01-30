export type CardinalRentalCounter = {
  "version": "0.0.0",
  "name": "cardinal_rental_counter",
  "instructions": [
    {
      "name": "increment",
      "accounts": [
        {
          "name": "rentalCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": false,
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
          "name": "bump",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "rentalCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          }
        ]
      }
    }
  ]
};

export const IDL: CardinalRentalCounter = {
  "version": "0.0.0",
  "name": "cardinal_rental_counter",
  "instructions": [
    {
      "name": "increment",
      "accounts": [
        {
          "name": "rentalCounter",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "user",
          "isMut": false,
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
          "name": "bump",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "rentalCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
