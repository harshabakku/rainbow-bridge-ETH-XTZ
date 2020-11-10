<div align="center">

  <h1><code>Rainbow Bridge CLI</code></h1>

  <p>
    <strong>OPS tool to Rainbow Bridge, an Ethereum to Tezos trustless, fully decentralized, bidirectional bridge</strong>
  </p>

  <p>
    <a href="https://buildkite.com/tezosprotocol/tez-bridge-cli"><img src=" https://badge.buildkite.com/93478642b0ddf8e3548c16d2e60c4adbca4fd853520b6a5bca.svg?branch=master" alt="Buildkite Build" /></a>
    <a href="https://npmjs.com/tez-bridge-cli"><img alt="npm" src="https://img.shields.io/npm/v/tez-bridge-cli.svg?style=flat-square"></a>
  </p>
</div>

## Table of Contents
- [Pre-requisites](#pre-requisites)
- [Usage](#usage)
- [Security](#security)
- [Gas costs](#gas-costs)
- [Using Bridge on Testnet](#using-bridge-on-testnet)
- [Deploying and Using Locally](#deploying-and-using-locally)
- [Contract Development Workflow](#contract-development-workflow)

## Pre-requisites

The current version of CLI is all-in-one package -- it is used both for production and testing. As a result, even if you
need CLI only for the token transfer you need to install all testing dependencies. This will be changed in the future.

- Install golang, [see](https://golang.org/dl/).
- Make sure you are using Node with version <=13. We recommend using [nvm](https://github.com/nvm-sh/nvm) for installing node and npm, if you already don't have one. This constraint will be removed soon;
- yarn
- docker, for deterministic compile rust contracts

### If you want to test with a local tezos node:

- You would also need to install resources needed to compile tezoscore (in the future this will only be required for the testing CLI):

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default stable
rustup target add wasm32-unknown-unknown
```

- Then install dependencies needed for the compilation of tezoscore, [see](https://docs.tezos.org/docs/local-setup/running-testnet#compiling-and-running-official-node-without-docker).
- python3, for tezosup

## Usage

You can install `tez-bridge-cli` from npm

```
    npm i -g tez-bridge-cli
```

To learn the commands that you can use with the tezbridge bridge run

```
    tezbridge --help
```

Alternatively, clone this repo, `yarn install`, then you can see what commands you can use with:

```
    ./index.js --help
```

Parameters of each command can be specified through environment variables, command line arguments, entries in the `~/.tezbridge/config.json` config file, or the default value will be used -- in that priority.
If argument is not provided and there is no default value the program will not execute.

If script successfully executes a command then each parameter provided through the command line argument will be
written into the config file. Additionally, if scripts generates new parameters (e.g. it deploys a contract to Ethereum
and obtains its address) will also be written into the config file. Arguments should not be specified multiple times.

Note, you can use environment variables to pass sensitive data which will not lead to it being written into the config file.

## Security

Bridge is secure as long as majority (1/2) of Etherem mining power is honest and supermajority (2/3) of TEZOS stake is honest.
There are no additional security requirements, except that Ethereum should be able to accept 1 transaction within 4 hour period even in the worst congestion scenario.

## Gas costs

TEZOS fees are negligible, both for bridge maintenance and for token transfer.
Ethereum fees are the following:

- To transfer ERC20 token from ETH to TEZOS: Approx 43,989 gas to set allowance and approx 37,407 gas to lock it;
- To transfer ERC20 token back from TEZOS to ETH: Approx 240,531 gas to unlock the token;
- To submit a TEZOS block header: approx 697,140 gas;
- To challenge a TEZOS block header: approx 700k gas.

As of 2020-07-14 (gas price is 40 gwei) the cost of running bridge on TEZOS mainnnet and Ethereum mainnet is approx 42 USD/day. The cost of ETH->TEZOS transfer of ERC20 token is 1 USD. The cost of TEZOS->ETH transfer of ERC20 token is 2 USD.

## Using Bridge on Testnet

### PoA vs PoW Ethereum networks

Rainbow bridge can be deployed either on PoW or PoA networks. However, the main use case of the bridge is Ethereum Mainnet, which makes its design very PoW-centric and it is only trustless and decentralized for PoW networks. Unfortunately, the only popular PoW testnet is Ropsten, which frequently undergoes huge reorgs of more than [16k blocks](https://github.com/tezos/tez-bridge-cli/issues/329), because people test 51% attacks on it. 16k reorgs can wipe out entire contracts and revert days of computations. Overall, Ropsten has the following unfortunate specifics that does not exist with Ethereum Mainnet:
* Extremely long re-orgs;
* Gas price volatility -- Ropsten blocks might have orders of magnitude different median gas price;
* Slow block production -- sometimes Ropsten blocks are produced once per several minutes;
* [Infura is unreliable on Ropsten](https://github.com/tezos/tez-bridge-cli/issues/330)

Therefore we advise users to not use Ropsten for bridge testing. Instead, we recommend using one of Ethereum's PoA testnet. Unfortunately, PoA networks have a differen header format and are also centralized by nature. Therefore when deploying bridge on PoA network please use `--tezos-client-trusted-signer` parameter. This will force `EthOnTezosClient` to not validate Ethereum headers (since PoA headers are not valid PoW headers) and accept them only from the provided authority.

The documenation below assumes Rinkeby testnet.

### Using existing bridge on Rinkeby

This section explains how to use existing bridge with mock ERC20 token that was already deployed. You would need to have some amount of this token on Rinkeby, so reach out to max@tezos.org if you want to give it a try.

We assume you have two accounts:
* One TEZOS account on TEZOS testnet with at least 1 TEZOS token. We denote it as `<tezos_token_holder_account>` and its secret key as `<tezos_token_holder_sk>`;
* One Ethereum account on Rinkeby testnet with at least 1 ETH and 100 ERC20 tokens (this example uses ERC20 deployed to `0x8151a8F90267bFf183E06921841C5dE774499388` as an example. If you want some of these ERC20 tokens please contact max@tezos.org). We denote it as `<eth_token_holder_address>` and its private key as `<eth_token_holder_sk>`;

Make sure you have tezbridge cli installed:
```bash
npm i -g tez-bridge-cli
```
If you have already used the bridge on this machine run a cleanup:
```bash
tezbridge clean
```
If you're using tez-bridge-cli 1.x, create `~/.tezbridge/config.json` file with the following content:
```json
{
        "tezosNetworkId": "testnet",
        "tezosNodeUrl": "https://rpc.testnet.tezos.org/",
        "ethNodeUrl": "https://rinkeby.infura.io/v3/<project_id>",
        "tezosMasterAccount": "<tezos_token_holder_account>",
        "tezosMasterSk": "<tezos_token_holder_sk>",
        "tezosClientAccount": "ethontezosclient10",
        "tezosProverAccount": "ethontezosprover10",
        "tezosClientTrustedSigner": "eth2tezosrelay10.testnet",
        "ethMasterSk": "<eth_token_holder_sk>",
        "ethEd25519Address": "0x9003342d15B21b4C42e1702447fE2f39FfAF55C2",
        "ethClientAddress": "0xF721c979db97413AA9D0F91ad531FaBF769bb09C",
        "ethProverAddress": "0xc5D62d66B8650E6242D9936c7e50E959BA0F9E37",
        "ethErc20Address": "0x8151a8F90267bFf183E06921841C5dE774499388",
        "ethLockerAddress": "0x5f7Cc23F90b5264a083dcB3b171c7111Dc32dD00",
        "tezosFunTokenAccount": "mintablefuntoken11"
}
```
If you are using tez-bridge-cli 2.x, create `~/.tezbridge/config.json` file with the following content:
```json
{
        "tezosNetworkId": "testnet",
        "tezosNodeUrl": "https://rpc.testnet.tezos.org/",
        "ethNodeUrl": "https://rinkeby.infura.io/v3/<project_id>",
        "tezosMasterAccount": "<tezos_token_holder_account>",
        "tezosMasterSk": "<tezos_token_holder_sk>",
        "tezosClientAccount": "ethontezosclient10",
        "tezosProverAccount": "ethontezosprover10",
        "tezosClientTrustedSigner": "eth2tezosrelay10.testnet",
        "ethMasterSk": "<eth_token_holder_sk>",
        "ethEd25519Address": "0x9003342d15B21b4C42e1702447fE2f39FfAF55C2",
        "ethClientAddress": "0xF721c979db97413AA9D0F91ad531FaBF769bb09C",
        "ethProverAddress": "0xc5D62d66B8650E6242D9936c7e50E959BA0F9E37",
        "tezosTokenFactoryAccount": "ntf4.bridge2.testnet",
        "ethErc20Address": "0x21e7381368baa3f3e9640fe19780c4271ad96f37",
        "ethLockerAddress": "0x7f66c116a4f51e43e7c1c33d3714a4acfa9c40fb",
        "tezosErc20Account": "21e7381368baa3f3e9640fe19780c4271ad96f37.ntf4.bridge2.testnet"
}
```
You can get infura project id, by registering at [infura.io](http://infura.io/).

To transfer ERC20 from ETH to TEZOS run:
```bash
tezbridge transfer-eth-erc20-to-tezos --amount 10 --eth-sender-sk <eth_token_holder_address> --tezos-receiver-account <tezos_token_holder_account>
```
(If the command interrupts in the middle re-run it and it will resume the transfer. PoA RPC sometimes has issues)
Wait for the transfer to finish. You should see:
```
Transferred
Balance of <tezos_token_holder_account> after the transfer is 10
```

To transfer ERC20 back from TEZOS to ETH run:
```bash
tezbridge transfer-eth-erc20-from-tezos --amount 1 --tezos-sender-account <tezos_token_holder_account> --tezos-sender-sk <tezos_token_holder_sk> --eth-receiver-address <eth_token_holder_address>
```

You should see:
```
ERC20 balance of <eth_token_holder_address> after the transfer: 91
```
Congratulations, you have achieved a roundtrip of ERC20 token through the bridge!
<!---
### Deploying new bridge

If you used bridge before from your machine, then clean up the setup. We recommend using cloud instance for deploying and running the bridge. Go to a cloud instance and install dependencies from [Pre-requisites](#pre-requisites).
Then run:
```bash
tezbridge clean
tezbridge prepare
```

Then initialize `EthOnTezosClient` and `EthOnTezosProver`:
```bash
tezbridge init-tezos-contracts --tezos-network-id testnet --tezos-node-url <testnet_nodes_url> --eth-node-url https://ropsten.infura.io/v3/<infura_project_id> --tezos-master-account <tezos_master_account> --tezos-master-sk <tezos_master_sk> --tezos-client-account ethontezosclient01 --tezos-client-init-balance 2000000000000000000000000000 --tezos-prover-account ethontezosprover01
```
* Make sure `ethontezosclient01` and `ethontezosprover01` do not exist yet. You can check it by going to https://explorer.testnet.tezos.org/accounts/ethontezosclient01 and https://explorer.testnet.tezos.org/accounts/ethontezosprover01 . If they exist, pick different names;
* You can get `<infura_project_id>` by creating a free [infura](http://infura.io/) account. If you are working in TEZOS organization please ask max@tezos.org;
* For `<testnet_nodes_url>` you can use `http://rpc.testnet.tezos.org/`. If you are working in TEZOS organization please ask max@tezos.org;

Then start `eth2tezos-relay`:
```bash
node index.js start eth2tezos-relay --tezos-master-account <eth2tezosrelay_account> --tezos-master-sk <eth2tezosrelay_sk>
```

Now initialize `TezosOnEthClient` and `TezosOnEthProver`:
```bash
node index.js init-eth-ed25519 --eth-master-sk <eth_master_sk>
node index.js init-eth-client --eth-client-lock-eth-amount 100000000000000000 --eth-client-lock-duration 600
node index.js init-eth-prover
```
This will set the bond to 0.1 ETH and challenge period to 10 minutes. **Do not use these settings on Mainnet!** Mainnet should be using 20ETH bond and 4 hour challenge period.

Then start the `tezos2eth-relay` and watchdog:
```bash
node index.js start tezos2eth-relay --eth-master-sk <tezos2ethrelay_sk>
node index.js start bride-watchdog --eth-master-sk <watchdog_sk>
```
-->

## Deploying and Using Locally

To locally test the bridge run:

```bash
tezbridge clean
tezbridge prepare
tezbridge start tezos-node
tezbridge start ganache
```

### Initializing the contracts

First let's initialize the contracts that bridge needs to function:

```bash
tezbridge init-tezos-contracts
tezbridge init-eth-ed25519
tezbridge init-eth-client --eth-client-lock-eth-amount 1000 --eth-client-lock-duration 10
tezbridge init-eth-prover
```

Now, let's set up token on Ethereum blockchain that we can transfer to TEZOS blockchain (this can be your own token).

```bash
tezbridge init-eth-erc20
tezbridge init-eth-locker
```

Now, let's initialize token factory on TEZOS blockchain.

```bash
tezbridge init-tezos-token-factory
```

### Starting the services

Now start the services that will relay the information between the chains:

```bash
tezbridge start eth2tezos-relay
tezbridge start tezos2eth-relay --eth-master-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201
tezbridge start bridge-watchdog --eth-master-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501202
```

Note, you can observe the logs of the relays by running:

```bash
pm2 logs
```

### Transferring tokens

Finally, let's transfer some tokens

```bash
tezbridge transfer-eth-erc20-to-tezos --amount 1000 --eth-sender-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 --tezos-receiver-account tez_bridge_eth_on_tezos_prover --tezos-master-account tezostokenfactory
```

Note, when we deployed ERC20 to the Ethereum blockchain we have minted a large number of tokens to the default master
key of Ganache, so we have transferred ERC20 tokens from it to `alice.test.tezos`.
Notice that we are using `tezostokenfactory` account here to pay for the TEZOS gas fees, any account for which we know a secret key would've worked too.
You must observe blocks being submitted.

Now let's try to transfer one token back to Ethereum

```bash
tezbridge transfer-eth-erc20-from-tezos --amount 1 --tezos-sender-account tez_bridge_eth_on_tezos_prover --tezos-sender-sk ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP --eth-receiver-address 0xEC8bE1A5630364292E56D01129E8ee8A9578d7D8
```

You should observe the change of the ERC20 balance as reported by the CLI.

## Contract Development Workflow

Above steps are ways to run a local bridge and development workflows you need if make any changes to tez-bridge-cli. If you want to update any of solidity or rust contracts, they're not in this repo now and workflow is as following.

- Install dependencies:
```bash
tezbridge clean
tezbridge prepare
```
- Start local TEZOS network and Ganache
```bash
tezbridge tezos-node
tezbridge ganache
```
- If you want to modify solidity contracts, go to `node_modules/tez-bridge-sol`, make changes there and run `./build_all.sh` to recompile solidity contracts.
- If you want to modify rust contracts, go to `node_modules/ranbow-bridge-rs`, make changes there and run `./build_all.sh` to recompile rust contracts.
- If you want to modify tezbridge bridge lib, go to `node_modules/tez-bridge-lib` and make changes there
- Follow instructions above to init eth contracts and tezos contracts, start services and start testing with bridge
- For changes to Solidity contract, Rust contract, and tez-bridge-lib, please submit PRs to: https://github.com/tezos/tez-bridge-sol , https://github.com/tezos/tez-bridge-rs , and https://github.com/tezos/tez-bridge-lib respectively.
- After PR merged in contract repos and tez-bridge-lib repo, we will periodically publish them as new version of npm packages. And tez-bridge-cli will adopt new version of them.


<!---
The following is outdated.
# Docker:

## Currently we have the following docker options:

1. Rainbow Docker image containing tezbridge ready for running
   - run the tezbridge docker image with a custom command
2. A development docker compose setup (docker-compose-dev.yml)
   - ganache
   - local tezos node
   - eth2tezos-relay
3. A production docker compose setup (docker-compose-prod.yml)
   - eth2tezos-relay

## Running the docker setup:

1. One options is to adapt the current config.json specified in the root folder of the project and build a new image.
2. Specifying the configuration flags through environment variables.

We recommend a usage of both, encouraging using the config.json for common configurations, while passing the secrets through environment variables.

Examples:

```
# Creating a docker image
docker build .

# Running the development env with config setup
docker-compose up

# Running the development env with ENV overrides
docker-compose -f docker-compose-dev.yml up -e MASTER_SK=<key> -e ...

# Running the production env just use:
docker-compose -f docker-compose-prod.yml instead
```
-->
