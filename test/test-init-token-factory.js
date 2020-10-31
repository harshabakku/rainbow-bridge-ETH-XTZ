const { nearlib } = require('rainbow-bridge-lib')
const {
  InitEthEd25519,
  InitEthErc20,
  InitEthLocker,
  InitEthClient,
  InitEthProver,
  InitNearContracts,
} = require('rainbow-bridge-lib/init')
const { RainbowConfig } = require('rainbow-bridge-lib/config')
const {
  maybeCreateAccount,
  verifyAccount,
} = require('rainbow-bridge-lib/rainbow/helpers')
const { BN } = require('ethereumjs-util')
const path = require('path')

const TEST_DIR = __dirname
const BRIDGE_SRC_DIR = path.join(TEST_DIR, '..')
const LIBS_SOL_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/rainbow-bridge-sol'
)
const LIBS_TC_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/rainbow-token-connector'
)

async function init() {
  RainbowConfig.declareOption(
    'near-token-factory-contract-path',
    'The path to the Wasm file containing the fungible contract. Note, this version of fungible contract should support minting.',
    path.join(LIBS_TC_SRC_DIR, 'res/bridge_token_factory.wasm')
  )
  RainbowConfig.declareOption(
    'near-token-factory-init-balance',
    'The initial balance of fungible token contract in femtoNEAR.',
    '1000000000000000000000000000'
  )
  RainbowConfig.declareOption('eth-gas-multiplier', '', '1')
  RainbowConfig.declareOption(
    'eth-erc20-abi-path',
    'Path to the .abi file defining Ethereum ERC20 contract.',
    path.join(LIBS_TC_SRC_DIR, 'res/TToken.full.abi')
  )
  RainbowConfig.declareOption(
    'eth-erc20-bin-path',
    'Path to the .bin file defining Ethereum ERC20 contract.',
    path.join(LIBS_TC_SRC_DIR, 'res/TToken.full.bin')
  )
  await InitEthErc20.execute()
  RainbowConfig.declareOption(
    'eth-ed25519-abi-path',
    '',
    path.join(LIBS_SOL_SRC_DIR, 'nearbridge/dist/Ed25519.full.abi')
  )
  RainbowConfig.declareOption(
    'eth-ed25519-bin-path',
    '',
    path.join(LIBS_SOL_SRC_DIR, 'nearbridge/dist/Ed25519.full.bin')
  )
  await InitEthEd25519.execute()
  RainbowConfig.declareOption('eth-client-lock-eth-amount', '', '1e18')
  RainbowConfig.declareOption('eth-client-lock-duration', '', '30')
  RainbowConfig.declareOption(
    'eth-client-abi-path',
    'Path to the .abi file defining Ethereum Client contract.',
    path.join(LIBS_SOL_SRC_DIR, 'nearbridge/dist/NearBridge.full.abi')
  )
  RainbowConfig.declareOption(
    'eth-client-bin-path',
    'Path to the .bin file defining Ethereum Client contract.',
    path.join(LIBS_SOL_SRC_DIR, 'nearbridge/dist/NearBridge.full.bin')
  )
  await InitEthClient.execute()
  RainbowConfig.declareOption(
    'eth-prover-abi-path',
    'Path to the .abi file defining Ethereum Prover contract.',
    path.join(LIBS_SOL_SRC_DIR, 'nearprover/dist/NearProver.full.abi')
  )
  RainbowConfig.declareOption(
    'eth-prover-bin-path',
    'Path to the .bin file defining Ethereum Prover contract.',
    path.join(LIBS_SOL_SRC_DIR, 'nearprover/dist/NearProver.full.bin')
  )
  await InitEthProver.execute()
  RainbowConfig.declareOption(
    'near-token-factory-account',
    '',
    'neartokenfactory'
  )
  RainbowConfig.declareOption(
    'eth-locker-abi-path',
    'Path to the .abi file defining Ethereum locker contract. This contract works in pair with mintable fungible token on NEAR blockchain.',
    path.join(LIBS_TC_SRC_DIR, 'res/BridgeTokenFactory.full.abi')
  )
  RainbowConfig.declareOption(
    'eth-locker-bin-path',
    'Path to the .bin file defining Ethereum locker contract. This contract works in pair with mintable fungible token on NEAR blockchain.',
    path.join(LIBS_TC_SRC_DIR, 'res/BridgeTokenFactory.full.bin')
  )
  await InitEthLocker.execute()
  RainbowConfig.declareOption(
    'near-prover-account',
    'The account of the Near Prover contract that can be used to accept ETH headers.',
    'rainbow_bridge_eth_on_near_prover'
  )
  await InitNearContracts.execute()
  RainbowConfig.saveConfig()
}

async function testInitTokenFactory() {
  await init()
  const masterAccount = RainbowConfig.getParam('near-master-account')
  const masterSk = RainbowConfig.getParam('near-master-sk')
  const tokenFactoryAccount = RainbowConfig.getParam(
    'near-token-factory-account'
  )
  let tokenSk = RainbowConfig.maybeGetParam('near-token-factory-sk')
  if (!tokenSk) {
    console.log(
      'Secret key for fungible token is not specified. Reusing master secret key.'
    )
    tokenSk = masterSk
    RainbowConfig.setParam('near-token-factory-sk', tokenSk)
  }
  const tokenContractPath = RainbowConfig.getParam(
    'near-token-factory-contract-path'
  )
  const tokenInitBalance = RainbowConfig.getParam(
    'near-token-factory-init-balance'
  )
  const proverAccount = RainbowConfig.getParam('near-prover-account')

  const nearNodeUrl = RainbowConfig.getParam('near-node-url')
  const nearNetworkId = RainbowConfig.getParam('near-network-id')

  const tokenPk = nearlib.KeyPair.fromString(tokenSk).getPublicKey()

  const keyStore = new nearlib.keyStores.InMemoryKeyStore()
  await keyStore.setKey(
    nearNetworkId,
    masterAccount,
    nearlib.KeyPair.fromString(masterSk)
  )
  await keyStore.setKey(
    nearNetworkId,
    tokenFactoryAccount,
    nearlib.KeyPair.fromString(tokenSk)
  )
  const near = await nearlib.connect({
    nodeUrl: nearNodeUrl,
    networkId: nearNetworkId,
    masterAccount: masterAccount,
    deps: { keyStore: keyStore },
  })

  await verifyAccount(near, masterAccount)
  console.log('Deploying token contract.')
  await maybeCreateAccount(
    near,
    masterAccount,
    tokenFactoryAccount,
    tokenPk,
    tokenInitBalance,
    tokenContractPath
  )
  const tokenFactoryContract = new nearlib.Contract(
    new nearlib.Account(near.connection, tokenFactoryAccount),
    tokenFactoryAccount,
    {
      changeMethods: ['new', 'deploy_bridge_token'],
      viewMethods: ['get_bridge_token_account_id'],
    }
  )
  const lockerAddress = RainbowConfig.getParam('eth-locker-address')
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
  RainbowConfig.saveConfig()
  console.log('EPIC')
}

testInitTokenFactory()
