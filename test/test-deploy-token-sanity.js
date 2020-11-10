const Web3 = require('web3')
const { tezoslib } = require('tez-bridge-lib')
const { BridgeConfig } = require('tez-bridge-lib/config')
const { BN } = require('ethereumjs-util')
const fs = require('fs')
const path = require('path')
const { normalizeEthKey } = require('tez-bridge-lib/tezbridge/robust')
const { DeployToken } = require('tez-bridge-lib/transfer-eth-erc20')

const TEST_DIR = __dirname
const BRIDGE_SRC_DIR = path.join(TEST_DIR, '..')
const LIBS_SOL_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/tez-bridge-sol'
)
const LIBS_TC_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/tezbridge-token-connector'
)

async function init() {
  BridgeConfig.declareOption(
    'tezos-token-factory-contract-path',
    'The path to the Wasm file containing the fungible contract. Note, this version of fungible contract should support minting.',
    path.join(LIBS_TC_SRC_DIR, 'res/bridge_token_factory.wasm')
  )
  BridgeConfig.declareOption(
    'tezos-token-factory-init-balance',
    'The initial balance of fungible token contract in femtoTEZOS.',
    '1000000000000000000000000000'
  )
  BridgeConfig.declareOption('eth-gas-multiplier', '', '1')
  BridgeConfig.declareOption(
    'eth-erc20-abi-path',
    'Path to the .abi file defining Ethereum ERC20 contract.',
    path.join(LIBS_TC_SRC_DIR, 'res/TToken.full.abi')
  )
  BridgeConfig.declareOption(
    'eth-erc20-bin-path',
    'Path to the .bin file defining Ethereum ERC20 contract.',
    path.join(LIBS_TC_SRC_DIR, 'res/TToken.full.bin')
  )
  BridgeConfig.declareOption(
    'eth-ed25519-abi-path',
    '',
    path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/Ed25519.full.abi')
  )
  BridgeConfig.declareOption(
    'eth-ed25519-bin-path',
    '',
    path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/Ed25519.full.bin')
  )
  BridgeConfig.declareOption('eth-client-lock-eth-amount', '', '1e18')
  BridgeConfig.declareOption('eth-client-lock-duration', '', '30')
  BridgeConfig.declareOption(
    'eth-client-abi-path',
    'Path to the .abi file defining Ethereum Client contract.',
    path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/TezosBridge.full.abi')
  )
  BridgeConfig.declareOption(
    'eth-client-bin-path',
    'Path to the .bin file defining Ethereum Client contract.',
    path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/TezosBridge.full.bin')
  )
  BridgeConfig.declareOption(
    'eth-prover-abi-path',
    'Path to the .abi file defining Ethereum Prover contract.',
    path.join(LIBS_SOL_SRC_DIR, 'tezosprover/dist/TezosProver.full.abi')
  )
  BridgeConfig.declareOption(
    'eth-prover-bin-path',
    'Path to the .bin file defining Ethereum Prover contract.',
    path.join(LIBS_SOL_SRC_DIR, 'tezosprover/dist/TezosProver.full.bin')
  )
  BridgeConfig.declareOption(
    'tezos-token-factory-account',
    '',
    'tezostokenfactory'
  )
  BridgeConfig.declareOption(
    'eth-locker-abi-path',
    'Path to the .abi file defining Ethereum locker contract. This contract works in pair with mintable fungible token on TEZOS blockchain.',
    path.join(LIBS_TC_SRC_DIR, 'res/BridgeTokenFactory.full.abi')
  )
  BridgeConfig.declareOption(
    'eth-locker-bin-path',
    'Path to the .bin file defining Ethereum locker contract. This contract works in pair with mintable fungible token on TEZOS blockchain.',
    path.join(LIBS_TC_SRC_DIR, 'res/BridgeTokenFactory.full.bin')
  )
  BridgeConfig.declareOption(
    'tezos-prover-account',
    'The account of the Tezos Prover contract that can be used to accept ETH headers.',
    'tez_bridge_eth_on_tezos_prover'
  )
  BridgeConfig.saveConfig()
}

async function testDeployToken() {
  await init()

  const web3 = new Web3(BridgeConfig.getParam('eth-node-url'))
  let ethMasterAccount = web3.eth.accounts.privateKeyToAccount(
    normalizeEthKey(BridgeConfig.getParam('eth-master-sk'))
  )
  web3.eth.accounts.wallet.add(ethMasterAccount)
  web3.eth.defaultAccount = ethMasterAccount.address
  ethMasterAccount = ethMasterAccount.address

  // use default ERC20 ABI
  const abiPath = BridgeConfig.getParam('eth-erc20-abi-path')
  const binPath = './MyERC20.full.bin'

  const tokenContract = new web3.eth.Contract(
    JSON.parse(fs.readFileSync(abiPath))
  )
  const txContract = await tokenContract
    .deploy({
      data: '0x' + fs.readFileSync(binPath),
      arguments: [],
    })
    .send({
      from: ethMasterAccount,
      gas: 3000000,
      gasPrice: new BN(await web3.eth.getGasPrice()).mul(
        new BN(BridgeConfig.getParam('eth-gas-multiplier'))
      ),
    })

  tokenAddress = normalizeEthKey(txContract.options.address)
  console.log('token address is', tokenAddress)
  web3.currentProvider.connection.close()

  await DeployToken.execute('myerc20', tokenAddress)

  console.log(
    'tezos-myerc20-account set to ' +
      BridgeConfig.getParam('tezos-myerc20-account')
  )
  console.log(
    'eth-myerc20-address set to ' +
      BridgeConfig.getParam('eth-myerc20-address')
  )
}

testDeployToken()
