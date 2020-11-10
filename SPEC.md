# Rainbow Bridge Specification

## Overview

The Rainbow bridge is a composition of software applications allowing smart contracts in different blockchains to establish trustless communication between them. It accomplished by having a mutual "smart contract"-based light clients in both blockchains; and cryptographical proofs of the including events (execution results) of smart contracts in blockchain blocks.

## Architecture

```
    +------------------------+     +------------------------+
    | Ethereum Blockchain    |     |        TEZOS Blockchain |
    |                        |     |                        |
    |        +------------+  | (1) |  +-----------+         |
    |        |            |  |=======>|           |         |
    |    (A) | TezosBridge |  |     |  | EthBridge | (B)     |
    |        |            |<=======|  |           |         |
    |        +------------+  | (2) |  +-----------+         |
    |              / \       |     |       / \              |
    |              |3|       |     |       |4|              |
    |        +------------+  |     |  +-----------+         |
    |    (C) | TezosProver |  |     |  | EthProver | (D)     |
    |        +------------+  |     |  +-----------+         |
    |              / \       |     |       / \              |
    |              |5|       |     |       |6|              |
    |        +------------+  |     |  +-----------+         |
    |      +------------+ |  |     |  | +-----------+       |
    |    +------------+ |-+  |     |  +-| +-----------+     |
    |    |   . . .    |-+    |     |    +-|   . . .   |     |
    |    +------------+      |     |      +-----------+     |
    |                        |     |                        |
    +------------------------+     +------------------------+
```

Software:
- **A.** *TezosBridge* – smart contract of Tezos light client hosted in Ethereum network. It receives Tezos block headers, verifies and stores block hashes only.
- **B.** *EthBridge* – smart contract of Ethereum light client hosted in Tezos network. It receives Ethereum block headers, verifies ethash and longest chain rule and stores block hashes only.
- **C.** *TezosProver* - smart contract in Ethereum network performing verification of Tezos transaction result was included into Tezos block. Uses Merkle trees and hash preimages for verification.
- **D.** *EthProver* - smart contract in Tezos network performing verification of Ethereum event was included into Ethereum block. Uses Merkle trees and hash preimages for verification.

Relations:
1. Non-trusted and non-authorized Ethereum relayer software (aka *EthRelayer*) could forward Ethereum block headers into *EthBridge* smart contract hosted in Tezos blockchain.
2. Non-trusted and non-authorized Tezos relayer software (aka *TezosRelayer*) could forward Tezos block headers into *TezosBridge* smart contract hosted in Ethereum network.
3. *TezosProver* verifies Tezos transaction result was included into Tezos bloc. And then checks if this block image exisits in *TezosBridge*.
4. *EthProver* verifies Ethereum event/log was included into Ethereum transaction receipt which was included into Ethereum block. And then checks if this block image exisits in *EthBridge*.
