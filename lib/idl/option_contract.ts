/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/option_contract.json`.
 */
export type OptionContract = {
  "address": "FFu3iJVJabfX4MuUmeyFpqk9YghMpqLKmKdoNRsVmuW",
  "metadata": {
    "name": "optionContract",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addCollateral",
      "discriminator": [
        127,
        82,
        121,
        42,
        161,
        176,
        249,
        206
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addCollateralParams"
            }
          }
        }
      ]
    },
    {
      "name": "addCustody",
      "discriminator": [
        247,
        254,
        126,
        17,
        26,
        6,
        215,
        117
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addCustodyParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "addLiquidity",
      "discriminator": [
        181,
        157,
        89,
        67,
        143,
        182,
        52,
        72
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "lpTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "lpTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "lpTokenMetadata",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "const",
                "value": [
                  11,
                  112,
                  101,
                  177,
                  227,
                  209,
                  124,
                  69,
                  56,
                  157,
                  82,
                  127,
                  107,
                  4,
                  195,
                  205,
                  88,
                  184,
                  108,
                  115,
                  26,
                  160,
                  253,
                  181,
                  73,
                  182,
                  209,
                  188,
                  3,
                  248,
                  41,
                  70
                ]
              },
              {
                "kind": "account",
                "path": "lpTokenMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                11,
                112,
                101,
                177,
                227,
                209,
                124,
                69,
                56,
                157,
                82,
                127,
                107,
                4,
                195,
                205,
                88,
                184,
                108,
                115,
                26,
                160,
                253,
                181,
                73,
                182,
                209,
                188,
                3,
                248,
                41,
                70
              ]
            }
          }
        },
        {
          "name": "tokenMetadataProgram",
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addLiquidityParams"
            }
          }
        }
      ]
    },
    {
      "name": "addPool",
      "discriminator": [
        115,
        230,
        212,
        211,
        175,
        49,
        39,
        169
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.name"
              }
            ]
          }
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.name"
              }
            ]
          }
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "addPoolParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "autoExercise",
      "discriminator": [
        92,
        40,
        119,
        42,
        152,
        121,
        62,
        28
      ],
      "accounts": [
        {
          "name": "tester",
          "writable": true,
          "signer": true
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "user",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "arg",
                "path": "params.user"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "params.user"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedOracle"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "autoExerciseOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "cancelLimitOrder",
      "discriminator": [
        132,
        156,
        132,
        31,
        67,
        40,
        232,
        97
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "receivingAccount"
          ]
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tpSlOrderbook",
          "optional": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "cancelLimitOrderParams"
            }
          }
        }
      ]
    },
    {
      "name": "claimOption",
      "discriminator": [
        253,
        12,
        10,
        151,
        212,
        164,
        101,
        103
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "user",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedOracle"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "claimOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "closeLimitOption",
      "discriminator": [
        143,
        127,
        170,
        220,
        114,
        23,
        80,
        156
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "user",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "payCustodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "payCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "payCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "closedOptionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              },
              {
                "kind": "const",
                "value": [
                  99,
                  108,
                  111,
                  115,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "payCustodyOracleAccount"
        },
        {
          "name": "lockedOracle"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "closeLimitOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "closeOption",
      "discriminator": [
        138,
        79,
        53,
        54,
        221,
        16,
        109,
        141
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "user",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "payCustodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "payCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "payCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "closedOptionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              },
              {
                "kind": "const",
                "value": [
                  99,
                  108,
                  111,
                  115,
                  101,
                  100
                ]
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "payCustodyOracleAccount"
        },
        {
          "name": "lockedOracle"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "closeOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "closePerpPosition",
      "discriminator": [
        243,
        3,
        225,
        178,
        43,
        96,
        112,
        184
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "receivingAccount"
          ]
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tpSlOrderbook",
          "optional": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "closePerpPositionParams"
            }
          }
        }
      ]
    },
    {
      "name": "createLpMint",
      "discriminator": [
        240,
        207,
        70,
        86,
        85,
        222,
        161,
        55
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.name"
              }
            ]
          }
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "lpTokenMintData"
            }
          }
        }
      ]
    },
    {
      "name": "editOption",
      "discriminator": [
        194,
        203,
        14,
        70,
        229,
        164,
        100,
        91
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount",
            "refundAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "refundAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "user",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "payCustodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "payCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "payCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "payCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "pay_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "payCustodyOracleAccount"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "editOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "executeLimitOrder",
      "discriminator": [
        52,
        33,
        60,
        30,
        47,
        100,
        40,
        22
      ],
      "accounts": [
        {
          "name": "executor",
          "writable": true,
          "signer": true
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.owner",
                "account": "position"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "executeLimitOrderParams"
            }
          }
        }
      ]
    },
    {
      "name": "executeTpSlOrder",
      "discriminator": [
        10,
        7,
        106,
        225,
        184,
        113,
        28,
        18
      ],
      "accounts": [
        {
          "name": "executor",
          "writable": true,
          "signer": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.owner",
                "account": "position"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "tpSlOrderbook",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  112,
                  95,
                  115,
                  108,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114,
                  98,
                  111,
                  111,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "tp_sl_orderbook.owner",
                "account": "tpSlOrderbook"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              },
              {
                "kind": "arg",
                "path": "params.contract_type"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "executeTpSlOrderParams"
            }
          }
        }
      ]
    },
    {
      "name": "exerciseOption",
      "discriminator": [
        231,
        98,
        131,
        183,
        245,
        93,
        122,
        48
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "user",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody"
              }
            ]
          }
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "lockedOracle"
        },
        {
          "name": "custodyOracle"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "exerciseOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "initTpSlOrderbook",
      "discriminator": [
        70,
        38,
        232,
        154,
        97,
        219,
        99,
        9
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tpSlOrderbook",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  112,
                  95,
                  115,
                  108,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114,
                  98,
                  111,
                  111,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              },
              {
                "kind": "arg",
                "path": "params.order_type"
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "optional": true
        },
        {
          "name": "optionDetail",
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "initTpSlOrderbookParams"
            }
          }
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "transferAuthority",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "liquidate",
      "discriminator": [
        223,
        179,
        226,
        125,
        48,
        46,
        39,
        74
      ],
      "accounts": [
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "ownerSettlementAccount",
          "writable": true
        },
        {
          "name": "liquidatorRewardAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.owner",
                "account": "position"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tpSlOrderbook",
          "optional": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "liquidateParams"
            }
          }
        }
      ]
    },
    {
      "name": "manageTpSlOrders",
      "discriminator": [
        132,
        143,
        139,
        238,
        114,
        115,
        241,
        246
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "tpSlOrderbook",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  112,
                  95,
                  115,
                  108,
                  95,
                  111,
                  114,
                  100,
                  101,
                  114,
                  98,
                  111,
                  111,
                  107
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              },
              {
                "kind": "arg",
                "path": "params.contract_type"
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "optional": true
        },
        {
          "name": "optionDetail",
          "optional": true
        },
        {
          "name": "solCustody",
          "optional": true
        },
        {
          "name": "usdcCustody",
          "optional": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "manageTpSlOrdersParams"
            }
          }
        }
      ]
    },
    {
      "name": "openLimitOption",
      "discriminator": [
        109,
        175,
        201,
        90,
        239,
        137,
        48,
        122
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true
        },
        {
          "name": "payCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "payCustodyMint"
              }
            ]
          }
        },
        {
          "name": "payCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "pay_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "payCustodyOracleAccount"
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "payCustodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "openLimitOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "openOption",
      "discriminator": [
        237,
        33,
        198,
        81,
        110,
        234,
        251,
        210
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true
        },
        {
          "name": "payCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "payCustodyMint"
              }
            ]
          }
        },
        {
          "name": "payCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "pay_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "payCustodyOracleAccount"
        },
        {
          "name": "lockedCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "lockedCustodyMint"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "payCustodyMint",
          "writable": true
        },
        {
          "name": "lockedCustodyMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "openOptionParams"
            }
          }
        }
      ]
    },
    {
      "name": "openPerpPosition",
      "discriminator": [
        74,
        120,
        242,
        19,
        84,
        93,
        80,
        37
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "openPerpPositionParams"
            }
          }
        }
      ]
    },
    {
      "name": "reallocPool",
      "discriminator": [
        114,
        128,
        37,
        167,
        71,
        227,
        40,
        178
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "reallocPoolParams"
            }
          }
        }
      ]
    },
    {
      "name": "removeCollateral",
      "discriminator": [
        86,
        222,
        130,
        86,
        92,
        20,
        72,
        65
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "receivingAccount"
          ]
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeCollateralParams"
            }
          }
        }
      ]
    },
    {
      "name": "removeCustody",
      "discriminator": [
        143,
        229,
        131,
        48,
        248,
        212,
        167,
        185
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custody",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "custodyTokenAccount",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyTokenMint"
              }
            ]
          }
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "custodyTokenMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeCustodyParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "removeLiquidity",
      "discriminator": [
        80,
        85,
        209,
        72,
        24,
        206,
        177,
        108
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "receivingAccount",
            "lpTokenAccount"
          ]
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "lpTokenAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "custody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "custodyOracleAccount"
        },
        {
          "name": "custodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "custodyMint"
              }
            ]
          }
        },
        {
          "name": "lpTokenMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  112,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool.name",
                "account": "pool"
              }
            ]
          }
        },
        {
          "name": "custodyMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removeLiquidityParams"
            }
          }
        }
      ]
    },
    {
      "name": "removePool",
      "discriminator": [
        132,
        42,
        53,
        138,
        28,
        220,
        170,
        55
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "removePoolParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "setOptionTpSl",
      "discriminator": [
        113,
        83,
        210,
        171,
        193,
        150,
        144,
        233
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "optionDetail",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.option_index"
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "option_detail.custody",
                "account": "optionDetail"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setOptionTpSlParams"
            }
          }
        }
      ]
    },
    {
      "name": "setSigners",
      "discriminator": [
        16,
        210,
        170,
        26,
        155,
        87,
        127,
        49
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "multisig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  117,
                  108,
                  116,
                  105,
                  115,
                  105,
                  103
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "setAdminSignersParams"
            }
          }
        }
      ],
      "returns": "u8"
    },
    {
      "name": "updateBorrowFees",
      "discriminator": [
        206,
        101,
        78,
        27,
        163,
        68,
        207,
        23
      ],
      "accounts": [
        {
          "name": "keeper",
          "signer": true
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "position.owner",
                "account": "position"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updateBorrowFeesParams"
            }
          }
        }
      ]
    },
    {
      "name": "updatePositionSize",
      "discriminator": [
        110,
        13,
        87,
        199,
        243,
        188,
        145,
        213
      ],
      "accounts": [
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "fundingAccount",
            "receivingAccount"
          ]
        },
        {
          "name": "fundingAccount",
          "writable": true
        },
        {
          "name": "receivingAccount",
          "writable": true
        },
        {
          "name": "transferAuthority",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  110,
                  115,
                  102,
                  101,
                  114,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "contract",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  116,
                  114,
                  97,
                  99,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "pool",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                "kind": "arg",
                "path": "params.pool_name"
              }
            ]
          }
        },
        {
          "name": "position",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              },
              {
                "kind": "arg",
                "path": "params.position_index"
              },
              {
                "kind": "account",
                "path": "pool"
              }
            ]
          }
        },
        {
          "name": "solCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "solMint"
              }
            ]
          }
        },
        {
          "name": "usdcCustody",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ]
          }
        },
        {
          "name": "solCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "sol_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "usdcCustodyTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  117,
                  115,
                  116,
                  111,
                  100,
                  121,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "pool"
              },
              {
                "kind": "account",
                "path": "usdc_custody.mint",
                "account": "custody"
              }
            ]
          }
        },
        {
          "name": "solOracleAccount"
        },
        {
          "name": "usdcOracleAccount"
        },
        {
          "name": "solMint",
          "writable": true
        },
        {
          "name": "usdcMint",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "updatePositionSizeParams"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "contract",
      "discriminator": [
        172,
        138,
        115,
        242,
        121,
        67,
        183,
        26
      ]
    },
    {
      "name": "custody",
      "discriminator": [
        1,
        184,
        48,
        81,
        93,
        131,
        63,
        145
      ]
    },
    {
      "name": "multisig",
      "discriminator": [
        224,
        116,
        121,
        186,
        68,
        161,
        79,
        236
      ]
    },
    {
      "name": "optionDetail",
      "discriminator": [
        204,
        187,
        248,
        154,
        76,
        215,
        205,
        46
      ]
    },
    {
      "name": "pool",
      "discriminator": [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      "name": "position",
      "discriminator": [
        170,
        188,
        143,
        228,
        122,
        64,
        247,
        208
      ]
    },
    {
      "name": "tpSlOrderbook",
      "discriminator": [
        130,
        67,
        195,
        182,
        123,
        26,
        94,
        153
      ]
    },
    {
      "name": "user",
      "discriminator": [
        159,
        117,
        95,
        227,
        239,
        151,
        58,
        236
      ]
    }
  ],
  "events": [
    {
      "name": "borrowFeesUpdated",
      "discriminator": [
        87,
        20,
        205,
        168,
        241,
        165,
        66,
        41
      ]
    },
    {
      "name": "collateralAdded",
      "discriminator": [
        172,
        68,
        58,
        249,
        157,
        64,
        74,
        141
      ]
    },
    {
      "name": "collateralRemoved",
      "discriminator": [
        38,
        57,
        214,
        30,
        121,
        178,
        129,
        4
      ]
    },
    {
      "name": "limitOptionClosed",
      "discriminator": [
        112,
        198,
        14,
        212,
        27,
        7,
        201,
        95
      ]
    },
    {
      "name": "limitOptionOpened",
      "discriminator": [
        234,
        186,
        4,
        55,
        5,
        154,
        80,
        130
      ]
    },
    {
      "name": "limitOrderCanceled",
      "discriminator": [
        17,
        78,
        31,
        66,
        209,
        14,
        103,
        227
      ]
    },
    {
      "name": "limitOrderExecuted",
      "discriminator": [
        230,
        96,
        79,
        110,
        208,
        225,
        214,
        243
      ]
    },
    {
      "name": "liquidityAdded",
      "discriminator": [
        154,
        26,
        221,
        108,
        238,
        64,
        217,
        161
      ]
    },
    {
      "name": "liquidityRemoved",
      "discriminator": [
        225,
        105,
        216,
        39,
        124,
        116,
        169,
        189
      ]
    },
    {
      "name": "optionClosed",
      "discriminator": [
        210,
        216,
        82,
        50,
        75,
        194,
        238,
        237
      ]
    },
    {
      "name": "optionExercised",
      "discriminator": [
        34,
        100,
        89,
        14,
        247,
        159,
        22,
        97
      ]
    },
    {
      "name": "optionOpened",
      "discriminator": [
        187,
        106,
        225,
        172,
        101,
        191,
        38,
        193
      ]
    },
    {
      "name": "optionTpSlSet",
      "discriminator": [
        241,
        151,
        226,
        131,
        100,
        228,
        35,
        254
      ]
    },
    {
      "name": "perpPositionClosed",
      "discriminator": [
        39,
        255,
        107,
        30,
        11,
        255,
        185,
        94
      ]
    },
    {
      "name": "perpPositionOpened",
      "discriminator": [
        181,
        0,
        246,
        154,
        111,
        252,
        41,
        214
      ]
    },
    {
      "name": "poolAdded",
      "discriminator": [
        38,
        229,
        6,
        208,
        172,
        23,
        178,
        179
      ]
    },
    {
      "name": "positionAccountClosed",
      "discriminator": [
        129,
        147,
        67,
        108,
        211,
        239,
        188,
        156
      ]
    },
    {
      "name": "positionLiquidated",
      "discriminator": [
        40,
        107,
        90,
        214,
        96,
        30,
        61,
        128
      ]
    },
    {
      "name": "positionSizeUpdated",
      "discriminator": [
        106,
        28,
        222,
        42,
        218,
        40,
        238,
        116
      ]
    },
    {
      "name": "tpSlOrderAdded",
      "discriminator": [
        187,
        237,
        174,
        41,
        196,
        203,
        142,
        120
      ]
    },
    {
      "name": "tpSlOrderExecuted",
      "discriminator": [
        202,
        47,
        135,
        125,
        175,
        228,
        126,
        77
      ]
    },
    {
      "name": "tpSlOrderRemoved",
      "discriminator": [
        67,
        131,
        190,
        201,
        32,
        242,
        71,
        140
      ]
    },
    {
      "name": "tpSlOrderUpdated",
      "discriminator": [
        157,
        2,
        60,
        208,
        11,
        218,
        210,
        51
      ]
    },
    {
      "name": "tpSlOrderbookClosed",
      "discriminator": [
        60,
        166,
        35,
        152,
        200,
        250,
        63,
        58
      ]
    },
    {
      "name": "tpSlOrderbookInitialized",
      "discriminator": [
        246,
        27,
        116,
        116,
        99,
        72,
        237,
        77
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "Invalid amount specified"
    },
    {
      "code": 6001,
      "name": "invalidOrderType",
      "msg": "Invalid position type"
    },
    {
      "code": 6002,
      "name": "invalidSlippage",
      "msg": "Invalid slippage tolerance"
    },
    {
      "code": 6003,
      "name": "priceSlippage",
      "msg": "Price slippage exceeded limits"
    },
    {
      "code": 6004,
      "name": "slippageExceededError",
      "msg": "Slippage exceeded on trade"
    },
    {
      "code": 6005,
      "name": "invalidParameterError",
      "msg": "Invalid parameter provided"
    },
    {
      "code": 6006,
      "name": "insufficientBalance",
      "msg": "Insufficient balance for operation"
    },
    {
      "code": 6007,
      "name": "insufficientFundsError",
      "msg": "Insufficient funds for transaction"
    },
    {
      "code": 6008,
      "name": "insufficientPoolLiquidity",
      "msg": "Insufficient pool liquidity"
    },
    {
      "code": 6009,
      "name": "unauthorized",
      "msg": "Unauthorized access"
    },
    {
      "code": 6010,
      "name": "invalidOwner",
      "msg": "Invalid owner"
    },
    {
      "code": 6011,
      "name": "invalidMintError",
      "msg": "Invalid mint specified"
    },
    {
      "code": 6012,
      "name": "invalidPrice",
      "msg": "Invalid price specified"
    },
    {
      "code": 6013,
      "name": "invalidPriceRange",
      "msg": "Invalid price range for TP/SL"
    },
    {
      "code": 6014,
      "name": "invalidTakeProfitPrice",
      "msg": "Invalid take profit price"
    },
    {
      "code": 6015,
      "name": "invalidStopLossPrice",
      "msg": "Invalid stop loss price"
    },
    {
      "code": 6016,
      "name": "positionTooSmall",
      "msg": "Position size too small"
    },
    {
      "code": 6017,
      "name": "invalidSignerBalanceError",
      "msg": "Insufficient balance to cover premium/collateral"
    },
    {
      "code": 6018,
      "name": "invalidLockedBalanceError",
      "msg": "Invalid locked balance in custody"
    },
    {
      "code": 6019,
      "name": "priceConfidenceError",
      "msg": "Price confidence interval too wide - oracle data unreliable"
    },
    {
      "code": 6020,
      "name": "precisionLossError",
      "msg": "Precision loss detected in calculations - values too small"
    },
    {
      "code": 6021,
      "name": "stalePriceError",
      "msg": "Stale price data"
    },
    {
      "code": 6022,
      "name": "orderbookAlreadyExists",
      "msg": "Orderbook already exists for this position"
    },
    {
      "code": 6023,
      "name": "invalidPosition",
      "msg": "Invalid position for orderbook"
    },
    {
      "code": 6024,
      "name": "positionLiquidated",
      "msg": "Position has been liquidated"
    },
    {
      "code": 6025,
      "name": "invalidOption",
      "msg": "Invalid option"
    },
    {
      "code": 6026,
      "name": "orderbookFull",
      "msg": "Orderbook is full"
    },
    {
      "code": 6027,
      "name": "orderbookNotEmpty",
      "msg": "Orderbook must be empty before closing"
    },
    {
      "code": 6028,
      "name": "positionNotEmpty",
      "msg": "Position must be empty before closing account"
    },
    {
      "code": 6029,
      "name": "positionNotClosed",
      "msg": "Position must be closed before closing account"
    }
  ],
  "types": [
    {
      "name": "addCollateralParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "paySol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "addCustodyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oracle",
            "type": "pubkey"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "addLiquidityParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "minLpAmountOut",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "addPoolParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "autoExerciseOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "borrowFeesUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "positionSizeUsd",
            "type": "u64"
          },
          {
            "name": "borrowFeePayment",
            "type": "u64"
          },
          {
            "name": "newAccruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "previousInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "newInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "updateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "borrowRateCurve",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "points",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "curvePoint"
                  }
                },
                11
              ]
            }
          }
        ]
      }
    },
    {
      "name": "cancelLimitOrderParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "closePercentage",
            "type": "u8"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "claimOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "closeLimitOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "closeQuantity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "closeOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "closeQuantity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "closePerpPositionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "closePercentage",
            "type": "u64"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "collateralAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "collateralAmountAdded",
            "type": "u64"
          },
          {
            "name": "collateralUsdAdded",
            "type": "u64"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "newCollateralAmount",
            "type": "u64"
          },
          {
            "name": "newCollateralUsd",
            "type": "u64"
          },
          {
            "name": "newLeverage",
            "type": "f64"
          },
          {
            "name": "newLiquidationPrice",
            "type": "u64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "collateralRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "collateralAmountRemoved",
            "type": "u64"
          },
          {
            "name": "collateralUsdRemoved",
            "type": "u64"
          },
          {
            "name": "newCollateralAmount",
            "type": "u64"
          },
          {
            "name": "newCollateralUsd",
            "type": "u64"
          },
          {
            "name": "newLeverage",
            "type": "f64"
          },
          {
            "name": "newLiquidationPrice",
            "type": "u64"
          },
          {
            "name": "withdrawalTokens",
            "type": "u64"
          },
          {
            "name": "withdrawalAsset",
            "type": "pubkey"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "contract",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pools",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "transferAuthorityBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "curvePoint",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "utilizationRateBps",
            "type": "u32"
          },
          {
            "name": "borrowRateBps",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "custody",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "tokenAccount",
            "type": "pubkey"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "oracle",
            "type": "pubkey"
          },
          {
            "name": "tokenOwned",
            "type": "u64"
          },
          {
            "name": "tokenLocked",
            "type": "u64"
          },
          {
            "name": "fees",
            "type": {
              "defined": {
                "name": "fees"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "tokenAccountBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "editOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "newStrike",
            "type": {
              "option": "f64"
            }
          },
          {
            "name": "newExpiry",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "newSize",
            "type": {
              "option": "f64"
            }
          },
          {
            "name": "maxAdditionalPremium",
            "type": "u64"
          },
          {
            "name": "minRefundAmount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "executeLimitOrderParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "executionPrice",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "executeTpSlOrderParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "triggerOrderType",
            "type": "u8"
          },
          {
            "name": "orderIndex",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "exerciseOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "fees",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ratioMult",
            "type": "u64"
          },
          {
            "name": "addLiquidity",
            "type": "u64"
          },
          {
            "name": "removeLiquidity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "initTpSlOrderbookParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "limitOptionClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "closeQuantity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "limitOptionOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "limitOrderCanceled",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "borrowFeesPaid",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "closePercentage",
            "type": "u64"
          },
          {
            "name": "refundedCollateral",
            "type": "u64"
          },
          {
            "name": "refundedCollateralUsd",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "limitOrderExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "borrowFeesPaid",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "executionPrice",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "liquidateParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "liquidatorRewardAccount",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "liquidityAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "depositAmount",
            "type": "u64"
          },
          {
            "name": "lpAmount",
            "type": "u64"
          },
          {
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "tokenAmountUsd",
            "type": "u64"
          },
          {
            "name": "poolAumUsd",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "liquidityRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "lpAmountIn",
            "type": "u64"
          },
          {
            "name": "transferAmount",
            "type": "u64"
          },
          {
            "name": "feeAmount",
            "type": "u64"
          },
          {
            "name": "withdrawalAmount",
            "type": "u64"
          },
          {
            "name": "poolAumUsd",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "lpTokenMintData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "manageTpSlOrdersParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "action",
            "type": {
              "defined": {
                "name": "orderAction"
              }
            }
          }
        ]
      }
    },
    {
      "name": "multisig",
      "serialization": "bytemuck",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "numSigners",
            "type": "u8"
          },
          {
            "name": "numSigned",
            "type": "u8"
          },
          {
            "name": "minSignatures",
            "type": "u8"
          },
          {
            "name": "instructionAccountsLen",
            "type": "u8"
          },
          {
            "name": "instructionDataLen",
            "type": "u16"
          },
          {
            "name": "instructionHash",
            "type": "u64"
          },
          {
            "name": "signers",
            "type": {
              "array": [
                "pubkey",
                6
              ]
            }
          },
          {
            "name": "signed",
            "type": {
              "array": [
                "u8",
                6
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "openLimitOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "strike",
            "type": "f64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredTime",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "limitPrice",
            "type": "f64"
          }
        ]
      }
    },
    {
      "name": "openOptionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "strike",
            "type": "f64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredTime",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "openPerpPositionParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sizeAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "side"
              }
            }
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "orderType"
              }
            }
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "maxSlippage",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "paySol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "optionClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "closeQuantity",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "optionDetail",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "profit",
            "type": "u64"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "exercised",
            "type": "u64"
          },
          {
            "name": "boughtBack",
            "type": "u64"
          },
          {
            "name": "claimed",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "tpSlOrderbook",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "optionExercised",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "exercised",
            "type": "u64"
          },
          {
            "name": "profit",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "optionOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "optionTpSlSet",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "quantity",
            "type": "u64"
          },
          {
            "name": "period",
            "type": "u64"
          },
          {
            "name": "expiredDate",
            "type": "i64"
          },
          {
            "name": "purchaseDate",
            "type": "u64"
          },
          {
            "name": "optionType",
            "type": "u8"
          },
          {
            "name": "strikePrice",
            "type": "u64"
          },
          {
            "name": "valid",
            "type": "bool"
          },
          {
            "name": "lockedAsset",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "premium",
            "type": "u64"
          },
          {
            "name": "premiumAsset",
            "type": "pubkey"
          },
          {
            "name": "limitPrice",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "type": "i64"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "orderAction",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "addTakeProfit",
            "fields": [
              {
                "name": "price",
                "type": "u64"
              },
              {
                "name": "sizePercent",
                "type": "u16"
              },
              {
                "name": "receiveSol",
                "type": "bool"
              }
            ]
          },
          {
            "name": "addStopLoss",
            "fields": [
              {
                "name": "price",
                "type": "u64"
              },
              {
                "name": "sizePercent",
                "type": "u16"
              },
              {
                "name": "receiveSol",
                "type": "bool"
              }
            ]
          },
          {
            "name": "updateTakeProfit",
            "fields": [
              {
                "name": "index",
                "type": "u8"
              },
              {
                "name": "newPrice",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "newSizePercent",
                "type": {
                  "option": "u16"
                }
              },
              {
                "name": "newReceiveSol",
                "type": {
                  "option": "bool"
                }
              }
            ]
          },
          {
            "name": "updateStopLoss",
            "fields": [
              {
                "name": "index",
                "type": "u8"
              },
              {
                "name": "newPrice",
                "type": {
                  "option": "u64"
                }
              },
              {
                "name": "newSizePercent",
                "type": {
                  "option": "u16"
                }
              },
              {
                "name": "newReceiveSol",
                "type": {
                  "option": "bool"
                }
              }
            ]
          },
          {
            "name": "removeTakeProfit",
            "fields": [
              {
                "name": "index",
                "type": "u8"
              }
            ]
          },
          {
            "name": "removeStopLoss",
            "fields": [
              {
                "name": "index",
                "type": "u8"
              }
            ]
          },
          {
            "name": "clearAll"
          }
        ]
      }
    },
    {
      "name": "orderType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "market"
          },
          {
            "name": "limit"
          }
        ]
      }
    },
    {
      "name": "perpPositionClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "tradeFeesPaid",
            "type": "u64"
          },
          {
            "name": "borrowFeesPaid",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "nativeExitAmount",
            "type": "u64"
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "closePercentage",
            "type": "u64"
          },
          {
            "name": "realizedPnl",
            "type": "i64"
          },
          {
            "name": "settlementTokens",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "perpPositionOpened",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "executionTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "maxSlippage",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "pool",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "custodies",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "ratios",
            "type": {
              "vec": {
                "defined": {
                  "name": "tokenRatios"
                }
              }
            }
          },
          {
            "name": "aumUsd",
            "type": "u128"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lpTokenBump",
            "type": "u8"
          },
          {
            "name": "borrowRateCurve",
            "type": {
              "defined": {
                "name": "borrowRateCurve"
              }
            }
          },
          {
            "name": "cumulativeInterestRateLong",
            "type": "u128"
          },
          {
            "name": "cumulativeInterestRateShort",
            "type": "u128"
          },
          {
            "name": "lastRateUpdate",
            "type": "i64"
          },
          {
            "name": "longOpenInterestUsd",
            "type": "u128"
          },
          {
            "name": "shortOpenInterestUsd",
            "type": "u128"
          },
          {
            "name": "totalBorrowedUsd",
            "type": "u128"
          },
          {
            "name": "lastUtilizationUpdate",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "poolAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "lpTokenMint",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "lpTokenBump",
            "type": "u8"
          },
          {
            "name": "cumulativeInterestRateLong",
            "type": "u128"
          },
          {
            "name": "cumulativeInterestRateShort",
            "type": "u128"
          },
          {
            "name": "longOpenInterestUsd",
            "type": "u128"
          },
          {
            "name": "shortOpenInterestUsd",
            "type": "u128"
          },
          {
            "name": "totalBorrowedUsd",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "position",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": {
              "defined": {
                "name": "orderType"
              }
            }
          },
          {
            "name": "side",
            "type": {
              "defined": {
                "name": "side"
              }
            }
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "executionTime",
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "borrowFeesPaid",
            "type": "u64"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "tpSlOrderbook",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "positionAccountClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "positionKey",
            "type": "pubkey"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "rentRefunded",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "positionLiquidated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u64"
          },
          {
            "name": "pubKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "tradeFeesPaid",
            "type": "u64"
          },
          {
            "name": "borrowFeesPaid",
            "type": "u64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "triggerPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "triggerAboveThreshold",
            "type": "bool"
          },
          {
            "name": "pnl",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "settlementTokens",
            "type": "u64"
          },
          {
            "name": "liquidatorRewardTokens",
            "type": "u64"
          },
          {
            "name": "liquidator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "positionSizeUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isIncrease",
            "type": "bool"
          },
          {
            "name": "sizeDeltaUsd",
            "type": "u64"
          },
          {
            "name": "collateralDelta",
            "type": "u64"
          },
          {
            "name": "previousSizeUsd",
            "type": "u64"
          },
          {
            "name": "newSizeUsd",
            "type": "u64"
          },
          {
            "name": "previousCollateralUsd",
            "type": "u64"
          },
          {
            "name": "newCollateralUsd",
            "type": "u64"
          },
          {
            "name": "newLeverage",
            "type": "f64"
          },
          {
            "name": "newLiquidationPrice",
            "type": "u64"
          },
          {
            "name": "lockedAmountDelta",
            "type": "u64"
          },
          {
            "name": "newLockedAmount",
            "type": "u64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "reallocPoolParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ratios",
            "type": {
              "vec": {
                "defined": {
                  "name": "tokenRatios"
                }
              }
            }
          },
          {
            "name": "custodyKey",
            "type": "pubkey"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "removeCollateralParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "removeCustodyParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "ratios",
            "type": {
              "vec": {
                "defined": {
                  "name": "tokenRatios"
                }
              }
            }
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "removeLiquidityParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lpAmountIn",
            "type": "u64"
          },
          {
            "name": "minAmountOut",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "removePoolParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "setAdminSignersParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "minSignatures",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "setOptionTpSlParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "takeProfitPrice",
            "type": {
              "option": "f64"
            }
          },
          {
            "name": "stopLossPrice",
            "type": {
              "option": "f64"
            }
          }
        ]
      }
    },
    {
      "name": "side",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "long"
          },
          {
            "name": "short"
          }
        ]
      }
    },
    {
      "name": "tokenRatios",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "target",
            "type": "u64"
          },
          {
            "name": "min",
            "type": "u64"
          },
          {
            "name": "max",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tpSlOrder",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizePercent",
            "type": "u16"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tpSlOrderAdded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "triggerOrderType",
            "type": "u8"
          },
          {
            "name": "positionSide",
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "sizePercent",
            "type": "u16"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tpSlOrderExecuted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "positionKey",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "pool",
            "type": "pubkey"
          },
          {
            "name": "custody",
            "type": "pubkey"
          },
          {
            "name": "collateralCustody",
            "type": "pubkey"
          },
          {
            "name": "orderType",
            "type": "u8"
          },
          {
            "name": "side",
            "type": "u8"
          },
          {
            "name": "isLiquidated",
            "type": "bool"
          },
          {
            "name": "entryPrice",
            "type": "u64"
          },
          {
            "name": "sizeUsd",
            "type": "u64"
          },
          {
            "name": "collateralUsd",
            "type": "u64"
          },
          {
            "name": "collateralAmount",
            "type": "u64"
          },
          {
            "name": "nativeExitAmount",
            "type": "u64"
          },
          {
            "name": "lockedAmount",
            "type": "u64"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "triggerOrderType",
            "type": "u8"
          },
          {
            "name": "orderIndex",
            "type": "u8"
          },
          {
            "name": "orderPrice",
            "type": "u64"
          },
          {
            "name": "executedPrice",
            "type": "u64"
          },
          {
            "name": "executedSizePercent",
            "type": "u16"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          },
          {
            "name": "tradeFees",
            "type": "u64"
          },
          {
            "name": "tradeFeesPaid",
            "type": "u64"
          },
          {
            "name": "borrowFeesPaid",
            "type": "u64"
          },
          {
            "name": "accruedBorrowFees",
            "type": "u64"
          },
          {
            "name": "realizedPnl",
            "type": "i64"
          },
          {
            "name": "settlementTokens",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "i64"
          },
          {
            "name": "updateTime",
            "type": "i64"
          },
          {
            "name": "executedAt",
            "type": "i64"
          },
          {
            "name": "lastBorrowFeesUpdateTime",
            "type": "i64"
          },
          {
            "name": "liquidationPrice",
            "type": "u64"
          },
          {
            "name": "cumulativeInterestSnapshot",
            "type": "u128"
          },
          {
            "name": "isFullClose",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tpSlOrderRemoved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "triggerOrderType",
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tpSlOrderUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "triggerOrderType",
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "newPrice",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "newSizePercent",
            "type": {
              "option": "u16"
            }
          },
          {
            "name": "newReceiveSol",
            "type": {
              "option": "bool"
            }
          }
        ]
      }
    },
    {
      "name": "tpSlOrderbook",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "takeProfitOrders",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tpSlOrder"
                  }
                },
                10
              ]
            }
          },
          {
            "name": "stopLossOrders",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tpSlOrder"
                  }
                },
                10
              ]
            }
          },
          {
            "name": "activeTpCount",
            "type": "u8"
          },
          {
            "name": "activeSlCount",
            "type": "u8"
          },
          {
            "name": "totalTpPercent",
            "type": "u16"
          },
          {
            "name": "totalSlPercent",
            "type": "u16"
          },
          {
            "name": "lastExecutedTpIndex",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "lastExecutedSlIndex",
            "type": {
              "option": "u8"
            }
          },
          {
            "name": "lastExecutionTime",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tpSlOrderbookClosed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "rentRefunded",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "tpSlOrderbookInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "position",
            "type": "pubkey"
          },
          {
            "name": "contractType",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "updateBorrowFeesParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "updatePositionSizeParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "positionIndex",
            "type": "u64"
          },
          {
            "name": "poolName",
            "type": "string"
          },
          {
            "name": "isIncrease",
            "type": "bool"
          },
          {
            "name": "sizeDeltaUsd",
            "type": "u64"
          },
          {
            "name": "collateralDelta",
            "type": "u64"
          },
          {
            "name": "paySol",
            "type": "bool"
          },
          {
            "name": "receiveSol",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "user",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "optionIndex",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "perpPositionCount",
            "type": "u64"
          }
        ]
      }
    }
  ]
};
