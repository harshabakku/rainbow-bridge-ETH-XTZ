#!/usr/bin/env node
const path = require('path')
const os = require('os')
const { program } = require('commander')

const { CleanCommand } = require('./commands/clean')
const { PrepareCommand } = require('./commands/prepare')
const { StatusCommand } = require('./commands/status')
const {
  StartEth2TezosRelayCommand,
} = require('./commands/start/eth2tezos-relay.js')
const {
  StartTezos2EthRelayCommand,
} = require('./commands/start/tezos2eth-relay.js')
const { StartWatchdogCommand } = require('./commands/start/watchdog.js')
const { StartGanacheNodeCommand } = require('./commands/start/ganache.js')
const { StartLocalTezosNodeCommand } = require('./commands/start/tezos.js')
const { StopManagedProcessCommand } = require('./commands/stop/process.js')
const {
  DangerSubmitInvalidTezosBlock,
} = require('./commands/danger-submit-invalid-tezos-block')
const { DangerDeployMyERC20 } = require('./commands/danger-deploy-myerc20')
const {
  TransferETHERC20ToTezos,
  TransferEthERC20FromTezos,
  DeployToken,
} = require('rainbow-bridge-lib/transfer-eth-erc20')
const { ETHDump } = require('./commands/eth-dump')
const { TezosDump } = require('rainbow-bridge-lib/rainbow/tezos-dump')
const { RainbowConfig } = require('rainbow-bridge-lib/config')
const {
  InitTezosContracts,
  InitTezosTokenFactory,
  InitEthEd25519,
  InitEthErc20,
  InitEthLocker,
  InitEthClient,
  InitEthProver,
} = require('rainbow-bridge-lib/init')

// source dir or where rainbow cli is installed (when install with npm)
const BRIDGE_SRC_DIR = __dirname
const LIBS_SOL_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/rainbow-bridge-sol'
)
const LIBS_RS_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/rainbow-bridge-rs'
)
const LIBS_TC_SRC_DIR = path.join(
  BRIDGE_SRC_DIR,
  'node_modules/rainbow-token-connector'
)

RainbowConfig.declareOption(
  'tezos-network-id',
  'The identifier of the TEZOS network that the given TEZOS node is expected to represent.'
)
RainbowConfig.declareOption('tezos-node-url', 'The URL of the TEZOS node.')
RainbowConfig.declareOption('eth-node-url', 'The URL of the Ethereum node.')
RainbowConfig.declareOption(
  'tezos-master-account',
  'The account of the master account on TEZOS blockchain that can be used to deploy and initialize the test contracts.' +
    ' This account will also own the initial supply of the fungible tokens.'
)
RainbowConfig.declareOption(
  'tezos-master-sk',
  'The secret key of the master account on TEZOS blockchain.'
)
RainbowConfig.declareOption(
  'eth-master-sk',
  'The secret key of the master account on Ethereum blockchain.'
)
RainbowConfig.declareOption(
  'tezos-client-account',
  'The account of the Tezos Client contract that can be used to accept ETH headers.',
  'rainbow_bridge_eth_on_tezos_client'
)
RainbowConfig.declareOption(
  'tezos-client-sk',
  'The secret key of the Tezos Client account. If not specified will use master SK.'
)
RainbowConfig.declareOption(
  'tezos-client-contract-path',
  'The path to the Wasm file containing the Tezos Client contract.',
  path.join(LIBS_RS_SRC_DIR, 'res/eth_client.wasm')
)
RainbowConfig.declareOption(
  'tezos-client-init-balance',
  'The initial balance of Tezos Client contract in femtoTEZOS.',
  '100000000000000000000000000'
)
RainbowConfig.declareOption(
  'tezos-client-validate-ethash',
  'Whether validate ethash of submitted eth block, should set to true on mainnet and false on PoA testnets',
  'true'
)
RainbowConfig.declareOption(
  'tezos-client-trusted-signer',
  'When non empty, deploy as trusted-signer mode where only tursted signer can submit blocks to client',
  ''
)
RainbowConfig.declareOption(
  'tezos-prover-account',
  'The account of the Tezos Prover contract that can be used to accept ETH headers.',
  'rainbow_bridge_eth_on_tezos_prover'
)
RainbowConfig.declareOption(
  'tezos-prover-sk',
  'The secret key of the Tezos Prover account. If not specified will use master SK.'
)
RainbowConfig.declareOption(
  'tezos-prover-contract-path',
  'The path to the Wasm file containing the Tezos Prover contract.',
  path.join(LIBS_RS_SRC_DIR, 'res/eth_prover.wasm')
)
RainbowConfig.declareOption(
  'tezos-prover-init-balance',
  'The initial balance of Tezos Prover contract in femtoTEZOS.',
  '100000000000000000000000000'
)
RainbowConfig.declareOption(
  'daemon',
  'Whether the process should be launched as a daemon.',
  'true',
  true
)
RainbowConfig.declareOption(
  'core-src',
  'Path to the tezoscore source. It will be downloaded if not provided.',
  ''
)
RainbowConfig.declareOption(
  'tezosup-src',
  'Path to the tezosup source. It will be downloaded if not provided.',
  ''
)
RainbowConfig.declareOption(
  'eth-gas-multiplier',
  'How many times more in Ethereum gas are we willing to overpay.',
  '1'
)

// User-specific arguments.
RainbowConfig.declareOption(
  'tezos-token-factory-account',
  'The account of the token factory contract that will be used to mint tokens locked on Ethereum.',
  'tezostokenfactory'
)
RainbowConfig.declareOption(
  'tezos-token-factory-sk',
  'The secret key of the token factory account. If not specified will use master SK.'
)
RainbowConfig.declareOption(
  'tezos-token-factory-contract-path',
  'The path to the Wasm file containing the token factory contract.',
  path.join(LIBS_TC_SRC_DIR, 'res/bridge_token_factory.wasm')
)
RainbowConfig.declareOption(
  'tezos-token-factory-init-balance',
  'The initial balance of token factory contract in yoctoTEZOS.',
  '1000000000000000000000000000'
)
RainbowConfig.declareOption(
  'eth-locker-address',
  'ETH address of the locker contract.'
)
RainbowConfig.declareOption(
  'eth-locker-abi-path',
  'Path to the .abi file defining Ethereum locker contract. This contract works in pair with mintable fungible token on TEZOS blockchain.',
  path.join(LIBS_TC_SRC_DIR, 'res/BridgeTokenFactory.full.abi')
)
RainbowConfig.declareOption(
  'eth-locker-bin-path',
  'Path to the .bin file defining Ethereum locker contract. This contract works in pair with mintable fungible token on TEZOS blockchain.',
  path.join(LIBS_TC_SRC_DIR, 'res/BridgeTokenFactory.full.bin')
)
RainbowConfig.declareOption(
  'eth-erc20-address',
  'ETH address of the ERC20 contract.'
)
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
RainbowConfig.declareOption(
  'eth-ed25519-address',
  'ETH address of the ED25519 contract.'
)
RainbowConfig.declareOption(
  'eth-ed25519-abi-path',
  'Path to the .abi file defining Ethereum ED25519 contract.',
  path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/Ed25519.full.abi')
)
RainbowConfig.declareOption(
  'eth-ed25519-bin-path',
  'Path to the .bin file defining Ethereum ED25519 contract.',
  path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/Ed25519.full.bin')
)
RainbowConfig.declareOption(
  'eth-client-lock-eth-amount',
  'Amount of Ether that should be temporarily locked when submitting a new header to EthClient, in wei.',
  '100000000000000000000'
)
RainbowConfig.declareOption(
  'eth-client-lock-duration',
  'The challenge window during which anyone can challenge an incorrect ED25519 signature of the Tezos block, in EthClient, in seconds.',
  14400
)
RainbowConfig.declareOption(
  'eth-client-replace-duration',
  'Minimum time difference required to replace a block during challenge period, in EthClient, in seconds.',
  18000
)
RainbowConfig.declareOption(
  'eth-client-address',
  'ETH address of the EthClient contract.'
)
RainbowConfig.declareOption(
  'eth-client-abi-path',
  'Path to the .abi file defining Ethereum Client contract.',
  path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/TezosBridge.full.abi')
)
RainbowConfig.declareOption(
  'eth-client-bin-path',
  'Path to the .bin file defining Ethereum Client contract.',
  path.join(LIBS_SOL_SRC_DIR, 'tezosbridge/dist/TezosBridge.full.bin')
)
RainbowConfig.declareOption(
  'eth-prover-address',
  'ETH address of the EthProver contract.'
)
RainbowConfig.declareOption(
  'eth-prover-abi-path',
  'Path to the .abi file defining Ethereum Prover contract.',
  path.join(LIBS_SOL_SRC_DIR, 'tezosprover/dist/TezosProver.full.abi')
)
RainbowConfig.declareOption(
  'eth-prover-bin-path',
  'Path to the .bin file defining Ethereum Prover contract.',
  path.join(LIBS_SOL_SRC_DIR, 'tezosprover/dist/TezosProver.full.bin')
)
RainbowConfig.declareOption(
  'tezos2eth-relay-min-delay',
  'Minimum number of seconds to wait if the relay can\'t submit a block right away.',
  '1'
)
RainbowConfig.declareOption(
  'tezos2eth-relay-max-delay',
  'Maximum number of seconds to wait if the relay can\'t submit a block right away.',
  '600'
)
RainbowConfig.declareOption(
  'tezos2eth-relay-error-delay',
  'Number of seconds to wait before retrying if there is an error.',
  '1'
)
RainbowConfig.declareOption(
  'watchdog-delay',
  'Number of seconds to wait after validating all signatures.',
  '300'
)
RainbowConfig.declareOption(
  'watchdog-error-delay',
  'Number of seconds to wait before retrying if there is an error.',
  '1'
)
RainbowConfig.declareOption('tezos-erc20-account', 'Must be declared before set')

program.version('0.1.0')

// General-purpose commands.
program.command('clean').action(CleanCommand.execute)

RainbowConfig.addOptions(
  program.command('prepare').action(PrepareCommand.execute),
  ['core-src', 'tezosup-src']
)

program.command('status').action(StatusCommand.execute)

// Maintainer commands.

const startCommand = program.command('start')

startCommand.command('tezos-node').action(StartLocalTezosNodeCommand.execute)

RainbowConfig.addOptions(
  startCommand.command('ganache').action(StartGanacheNodeCommand.execute),
  ['daemon']
)

RainbowConfig.addOptions(
  startCommand
    .command('eth2tezos-relay')
    .action(StartEth2TezosRelayCommand.execute),
  [
    'tezos-master-account',
    'tezos-master-sk',
    'tezos-client-account',
    'tezos-network-id',
    'tezos-node-url',
    'daemon',
  ]
)

RainbowConfig.addOptions(
  startCommand
    .command('tezos2eth-relay')
    .action(StartTezos2EthRelayCommand.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'tezos-node-url',
    'tezos-network-id',
    'eth-client-abi-path',
    'eth-client-address',
    'tezos2eth-relay-min-delay',
    'tezos2eth-relay-max-delay',
    'tezos2eth-relay-error-delay',
    'eth-gas-multiplier',
    'daemon',
  ]
)

RainbowConfig.addOptions(
  startCommand.command('bridge-watchdog').action(StartWatchdogCommand.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-client-abi-path',
    'daemon',
    'watchdog-delay',
    'watchdog-error-delay',
  ]
)

const stopCommand = program.command('stop')

stopCommand.command('all').action(StopManagedProcessCommand.execute)

stopCommand.command('tezos-node').action(StopManagedProcessCommand.execute)

stopCommand.command('ganache').action(StopManagedProcessCommand.execute)

stopCommand.command('eth2tezos-relay').action(StopManagedProcessCommand.execute)

stopCommand.command('tezos2eth-relay').action(StopManagedProcessCommand.execute)

stopCommand.command('bridge-watchdog').action(StopManagedProcessCommand.execute)

RainbowConfig.addOptions(
  program
    .command('init-tezos-contracts')
    .description(
      'Deploys and initializes Tezos Client and Tezos Prover contracts to TEZOS blockchain.'
    )
    .action(InitTezosContracts.execute),
  [
    'tezos-network-id',
    'tezos-node-url',
    'eth-node-url',
    'tezos-master-account',
    'tezos-master-sk',
    'tezos-client-account',
    'tezos-client-sk',
    'tezos-client-contract-path',
    'tezos-client-init-balance',
    'tezos-client-validate-ethash',
    'tezos-client-trusted-signer',
    'tezos-prover-account',
    'tezos-prover-sk',
    'tezos-prover-contract-path',
    'tezos-prover-init-balance',
  ]
)

RainbowConfig.addOptions(
  program
    .command('init-eth-ed25519')
    .description(
      'Deploys and initializes ED25519 Solidity contract. It replaces missing precompile.'
    )
    .action(InitEthEd25519.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-ed25519-abi-path',
    'eth-ed25519-bin-path',
    'eth-gas-multiplier',
  ]
)

RainbowConfig.addOptions(
  program
    .command('init-eth-client')
    .description('Deploys and initializes EthClient.')
    .action(InitEthClient.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-client-abi-path',
    'eth-client-bin-path',
    'eth-ed25519-address',
    'eth-client-lock-eth-amount',
    'eth-client-lock-duration',
    'eth-client-replace-duration',
    'eth-gas-multiplier',
  ]
)

RainbowConfig.addOptions(
  program
    .command('init-eth-prover')
    .description('Deploys and initializes EthProver.')
    .action(InitEthProver.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-prover-abi-path',
    'eth-prover-bin-path',
    'eth-client-address',
    'eth-gas-multiplier',
  ]
)

// User commands.

RainbowConfig.addOptions(
  program
    .command('init-tezos-token-factory')
    .description(
      'Deploys and initializes token factory to TEZOS blockchain. Requires locker on Ethereum side.'
    )
    .action(InitTezosTokenFactory.execute),
  [
    'tezos-token-factory-account',
    'tezos-token-factory-sk',
    'tezos-token-factory-contract-path',
    'tezos-token-factory-init-balance',
    'eth-locker-address',
  ]
)

RainbowConfig.addOptions(
  program
    .command('deploy-token <token_name> <token_address>')
    .description('Deploys and initializes token on TEZOS.')
    .action(DeployToken.execute),
  ['tezos-token-factory-account']
)

RainbowConfig.addOptions(
  program
    .command('init-eth-locker')
    .description(
      'Deploys and initializes locker contract on Ethereum blockchain. Requires mintable fungible token on Tezos side.'
    )
    .action(InitEthLocker.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-locker-abi-path',
    'eth-locker-bin-path',
    'eth-erc20-address',
    'tezos-token-factory-account',
    'eth-prover-address',
    'eth-gas-multiplier',
  ]
)

RainbowConfig.addOptions(
  program
    .command('init-eth-erc20')
    .description(
      'Deploys and initializes ERC20 contract on Ethereum blockchain.'
    )
    .action(InitEthErc20.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-erc20-abi-path',
    'eth-erc20-bin-path',
    'eth-gas-multiplier',
  ]
)

RainbowConfig.addOptions(
  program
    .command('transfer-eth-erc20-to-tezos')
    .action(TransferETHERC20ToTezos.execute)
    .option('--amount <amount>', 'Amount of ERC20 tokens to transfer')
    .option(
      '--eth-sender-sk <eth_sender_sk>',
      'The secret key of the Ethereum account that will be sending ERC20 token.'
    )
    .option(
      '--tezos-receiver-account <tezos_receiver_account>',
      'The account on TEZOS blockchain that will be receiving the minted token.'
    )
    .option(
      '--token-name <token_name>',
      'Specific ERC20 token that is already bound by `deploy-token`.'
    ),
  [
    'eth-node-url',
    'eth-erc20-address',
    'eth-erc20-abi-path',
    'eth-locker-address',
    'eth-locker-abi-path',
    'tezos-node-url',
    'tezos-network-id',
    'tezos-token-factory-account',
    'tezos-client-account',
    'tezos-master-account',
    'tezos-master-sk',
    'eth-gas-multiplier',
  ]
)

RainbowConfig.addOptions(
  program
    .command('transfer-eth-erc20-from-tezos')
    .action(TransferEthERC20FromTezos.execute)
    .option('--amount <amount>', 'Amount of ERC20 tokens to transfer')
    .option(
      '--tezos-sender-account <tezos_sender_account>',
      'Tezos account that will be sending fungible token.'
    )
    .option(
      '--tezos-sender-sk <tezos_sender_sk>',
      'The secret key of Tezos account that will be sending the fungible token.'
    )
    .option(
      '--eth-receiver-address <eth_receiver_address>',
      'The account that will be receiving the token on Ethereum side.'
    )
    .option(
      '--token-name <token_name>',
      'Specific ERC20 token that is already bound by `deploy-token`.'
    ),
  [
    'tezos-node-url',
    'tezos-network-id',
    'tezos-token-factory-account',
    'eth-node-url',
    'eth-erc20-address',
    'eth-erc20-abi-path',
    'eth-locker-address',
    'eth-locker-abi-path',
    'eth-client-abi-path',
    'eth-client-address',
    'eth-master-sk',
    'eth-prover-abi-path',
    'eth-prover-address',
    'eth-gas-multiplier',
  ]
)

// Testing command
const dangerCommand = program
  .command('DANGER')
  .description(
    'Dangerous commands that should only be used for testing purpose.'
  )

RainbowConfig.addOptions(
  dangerCommand
    .command('submit_invalid_tezos_block')
    .description(
      'Fetch latest tezos block, randomly mutate one byte and submit to TezosBridge'
    )
    .action(DangerSubmitInvalidTezosBlock.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'tezos-node-url',
    'tezos-network-id',
    'eth-client-abi-path',
    'eth-client-address',
    'tezos2eth-relay-min-delay',
    'tezos2eth-relay-max-delay',
    'tezos2eth-relay-error-delay',
    'eth-gas-multiplier',
  ]
)

RainbowConfig.addOptions(
  dangerCommand
    .command('deploy_test_erc20')
    .description('Deploys MyERC20')
    .action(DangerDeployMyERC20.execute),
  [
    'eth-node-url',
    'eth-master-sk',
    'eth-erc20-abi-path',
    'eth-gas-multiplier',
  ]
)

program
  .command('eth-dump <kind_of_data>')
  .option('--eth-node-url <eth_node_url>', 'ETH node API url')
  .option('--path <path>', 'Dir path to dump eth data')
  .option(
    '--start-block <start_block>',
    'Start block number (inclusive), default to be 4.3K blocks away from start block'
  )
  .option(
    '--end-block <end_block>',
    'End block number (inclusive), default to be latest block'
  )
  .action(ETHDump.execute)

RainbowConfig.addOptions(
  program
    .command('tezos-dump <kind_of_data>')
    .option('--path <path>', 'Dir path to dump tezos data')
    .option(
      '--num-blocks <num_blocks>',
      'Number of blocks to dump, default: 100'
    )
    .action(TezosDump.execute),
  ['tezos-node-url']
)
;(async () => {
  await program.parseAsync(process.argv)
})()
