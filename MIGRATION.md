# Migration Instructions

## From 1.x to 2.0.0

2.0.0 introduce three incompatible change in Ethereum and TEZOS contracts: bridge-token-factory, generic token locker and TToken.

### Migration Instruction for your code

#### Token Factory on TEZOS

Token factory is a new concept introduced in tezbridge bridge lib/cli 2.0. It follows ERC721 that allow you to create multiple ERC20 tokens on TEZOS. Back in 1.x, there was only one ERC token implemented as [mintable-fungible-token](https://github.com/tezos/tez-bridge-rs/tree/master/mintable-fungible-token) and only need initialize that. In 2.0, you need to first initalize the token factory contract

https://github.com/tezos/tez-bridge-lib/blob/master/init/tezos-token-factory.js#L74

And then deploy a erc20 token in factory:

https://github.com/tezos/tez-bridge-lib/blob/master/transfer-eth-erc20/deploy-token.js#L76

After that deployed erc20 token is very similar to 1.x mintable-fungible-token, you can deposit (renamed from mint, usage is same) or withdraw (renamed from burn, usage is same) it.

#### Token Locker on Ethereum

Token locker soldity contract has changed from:

```
constructor(IERC20 ethToken, bytes memory tezosToken, ITezosProver prover) public;
function lockToken(uint256 amount, string memory accountId) public;
function unlockToken(bytes memory proofData, uint64 proofBlockHeight) public;
```

to:

```
constructor(bytes memory tezosTokenFactory, ITezosProver prover) public;
function lockToken(IERC20 token, uint256 amount, string memory accountId) public;
function unlockToken(bytes memory proofData, uint64 proofBlockHeader) public;
```

You will need to call updated method. Basically, token locker in tezbridge bridge lib/cli 1.x can only lock one kind of token,
specified when initialized the locker. Locker in tezbridge bridge 2.0 (provided by [tezbridge-token-connector](https://github.com/tezos/tezbridge-token-connector)) can lock and unlock any erc20 token created in `tezosTokenFactory`. Therefore when locking, which token to lock is required parameter.

#### TToken on Ethereum

[MyERC20.sol](https://github.com/tezos/tez-bridge-sol/blob/a3968cee82f2923aee9fbe2387b7045993eafc0f/token-locker/contracts/MyERC20.sol) in tezbridge bridge 1.0 has been replaced with [TToken.sol](https://github.com/tezos/tezbridge-token-connector/blob/master/erc20-connector/contracts/test/TToken.sol). This is a compatible change.

### Migration Instruction to Use TEZOS Deployed Contracts and Bridge Services

You only need to update the config file to use new contract addresses, see [Using Bridge on Testnet](README.md#using-bridge-on-testnet) and look for `tez-bridge-cli 2.x`

### Migration Instruction for Deployment

If you are deploying your own bridge, eth2tezos relayer, tezos2eth relayer, eth ed25519, eth client, eth prover, tezos client and tezos prover can be reused. you need to remove these lines from your `~/.tezbridge/config.json`:

```
    "ethErc20Address": "...",
    "ethLockerAddress": "...",
    "tezosFunTokenAccount": "..."
```

And add this line:

```
	"tezosTokenFactoryAccount": "fill a non exist tezos account in your namespace, going to be created as your token factory account",
```

Then redeploy these contracts:

```
tezbridge init-eth-erc20 # use TToken
tezbridge init-eth-locker # use new generic locker
tezbridge init-tezos-token-factory # use token factory
```

You should be able to use bridge again with same transfer from tezos and to tezos command as before!
