const { tezoslib } = require('tez-bridge-lib')
const {
  InitEthEd25519,
  InitEthErc20,
  InitEthLocker,
  InitEthClient,
  InitEthProver,
  InitTezosContracts,
} = require('tez-bridge-lib/init')
const { BridgeConfig } = require('tez-bridge-lib/config')
const {
  maybeCreateAccount,
  verifyAccount,
} = require('tez-bridge-lib/tezbridge/helpers')
const { BN } = require('ethereumjs-util')
const path = require('path')

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
  await InitEthErc20.execute()
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
  await InitEthEd25519.execute()
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
  await InitEthClient.execute()
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
  await InitEthProver.execute()
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
  await InitEthLocker.execute()
  BridgeConfig.declareOption(
    'tezos-prover-account',
    'The account of the Tezos Prover contract that can be used to accept ETH headers.',
    'tez_bridge_eth_on_tezos_prover'
  )
  await InitTezosContracts.execute()
  BridgeConfig.saveConfig()
}

async function testInitTokenFactory() {
  await init()
  const masterAccount = BridgeConfig.getParam('tezos-master-account')
  const masterSk = BridgeConfig.getParam('tezos-master-sk')
  const tokenFactoryAccount = BridgeConfig.getParam(
    'tezos-token-factory-account'
  )
  let tokenSk = BridgeConfig.maybeGetParam('tezos-token-factory-sk')
  if (!tokenSk) {
    console.log(
      'Secret key for fungible token is not specified. Reusing master secret key.'
    )
    tokenSk = masterSk
    BridgeConfig.setParam('tezos-token-factory-sk', tokenSk)
  }
  const tokenContractPath = BridgeConfig.getParam(
    'tezos-token-factory-contract-path'
  )
  const tokenInitBalance = BridgeConfig.getParam(
    'tezos-token-factory-init-balance'
  )
  const proverAccount = BridgeConfig.getParam('tezos-prover-account')

  const tezosNodeUrl = BridgeConfig.getParam('tezos-node-url')
  const tezosNetworkId = BridgeConfig.getParam('tezos-network-id')

  const tokenPk = tezoslib.KeyPair.fromString(tokenSk).getPublicKey()

  const keyStore = new tezoslib.keyStores.InMemoryKeyStore()
  await keyStore.setKey(
    tezosNetworkId,
    masterAccount,
    tezoslib.KeyPair.fromString(masterSk)
  )
  await keyStore.setKey(
    tezosNetworkId,
    tokenFactoryAccount,
    tezoslib.KeyPair.fromString(tokenSk)
  )
  const tezos = await tezoslib.connect({
    nodeUrl: tezosNodeUrl,
    networkId: tezosNetworkId,
    masterAccount: masterAccount,
    deps: { keyStore: keyStore },
  })

  await verifyAccount(tezos, masterAccount)
  console.log('Deploying token contract.')
  await maybeCreateAccount(
    tezos,
    masterAccount,
    tokenFactoryAccount,
    tokenPk,
    tokenInitBalance,
    tokenContractPath
  )
  const tokenFactoryContract = new tezoslib.Contract(
    new tezoslib.Account(tezos.connection, tokenFactoryAccount),
    tokenFactoryAccount,
    {
      changeMethods: ['new', 'deploy_bridge_token'],
      viewMethods: ['get_bridge_token_account_id'],
    }
  )
  const lockerAddress = BridgeConfig.getParam('eth-locker-address')
  try {
    // Try initializing the factory.
    await tokenFactoryContract.new(
      {
        prover_account: proverAccount,
        locker_address: lockerAddress.startsWith('0x')
          ? lockerAddress.substr(2)
          : lockerAddress,
      },
      new BN('300000000000000')
    )
  } catch (err) {
    console.log(`Failed to initialize the token factory ${err}`)
    process.exit(1)
  }
  BridgeConfig.saveConfig()
  console.log('EPIC')
}

testInitTokenFactory()
