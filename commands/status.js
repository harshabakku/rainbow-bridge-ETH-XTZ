const Web3 = require('web3')
const fetch = require('node-fetch')
const fs = require('fs')
const ProcessManager = require('pm2-promise')

const { verifyAccountGently } = require('tez-bridge-lib/tezbridge/helpers')
const { BridgeConfig } = require('tez-bridge-lib/config')
const { normalizeEthKey } = require('tez-bridge-lib/tezbridge/robust')

// Verdicts
const Ok = 'ok'
const Info = 'info'
const Warn = 'warn'
const Error = 'error'

const Running = 'running'
const Valid = 'valid'
const Deployed = 'deployed'
const Unknown = 'unknown'
const Unreachable = 'unreachable'
const Invalid = 'invalid'
const NotVerified = 'not verified'
const UsingMaster = 'using data from master account'
const RecordNotFound = 'record not found'
const ABINotFound = 'abi not found'
const ContractNotFound = 'contract not found'
const InternalError = 'internal error'

const NoColor = '\x1B[39m'

// TODO please refactor to avoid async/await
const request = async (url) => {
  try {
    const response = await fetch(url)
    const json = await response.json()
    return [
      Ok,
      JSON.stringify(json.version),
      JSON.stringify(json.sync_info['latest_block_height']),
    ]
  } catch (err) {
    return [Error, Unreachable, Unknown]
  }
}

class Status {
  constructor(value, verdict = Error, explanation = null) {
    this.value = value
    this.verdict = verdict
    this.explanation = explanation
  }
}

class TezosContracts {
  // TODO put it into constructor if possible
  async init(tezos) {
    const masterAccount = BridgeConfig.getParam('tezos-master-account')
    if (!masterAccount) {
      return
    }
    this.client = await this.checkContract(
      tezos,
      masterAccount,
      BridgeConfig.getParam('tezos-client-account')
    )
    this.prover = await this.checkContract(
      tezos,
      masterAccount,
      BridgeConfig.getParam('tezos-prover-account')
    )
    this.funToken = await this.checkContract(
      tezos,
      masterAccount,
      BridgeConfig.getParam('tezos-token-factory-account')
    )
  }

  async checkContract(tezos, masterAccount, contractAccount) {
    if (!contractAccount) {
      return new Status(Unknown, Error, ContractNotFound)
    }
    try {
      const tezosAccount = new tezoslib.Account(tezos.connection, masterAccount)
      const contract = new tezoslib.Contract(tezosAccount, contractAccount, {
        changeMethods: ['boo'],
        viewMethods: [],
      })
      // TODO #270 implement `initialized` method to TEZOS contracts
      // TODO #257 check the code deployed if possible
      try {
        await contract.boo()
      } catch (err) {
        if (
          err.message &&
          err.message.indexOf('Contract method is not found') >= 0
        ) {
          return new Status(contract.contractId, Ok, Deployed)
        } else {
          return new Status(Unknown, Info, NotVerified)
        }
      }
    } catch (err) {
      return new Status(Unknown, Error, InternalError)
    }
  }
}

class TezosStatus {
  // TODO put it into constructor if possible
  async init() {
    const networkId = BridgeConfig.getParam('tezos-network-id')
    this.networkLocation = networkId
      ? new Status(networkId, Info)
      : new Status(Unknown)

    const masterAccount = BridgeConfig.getParam('tezos-master-account')
    const masterKey = BridgeConfig.getParam('tezos-master-sk')
    const clientAccount = BridgeConfig.getParam('tezos-client-account')
    const clientKey = BridgeConfig.getParam('tezos-client-sk')
    const proverAccount = BridgeConfig.getParam('tezos-prover-account')
    const proverKey = BridgeConfig.getParam('tezos-prover-sk')

    // Init with basic data
    this.masterAccount = masterAccount
      ? new Status(masterAccount, Info, NotVerified)
      : new Status(Unknown)
    this.masterKey = masterKey
      ? new Status(masterKey, Info)
      : new Status(Unknown)
    this.clientAccount = clientAccount
      ? new Status(clientAccount, Info, NotVerified)
      : new Status(Unknown, Info, UsingMaster)
    this.clientKey = clientKey
      ? new Status(clientKey, Info)
      : new Status(Unknown, Info, UsingMaster)
    this.proverAccount = proverAccount
      ? new Status(proverAccount, Info, NotVerified)
      : new Status(Unknown, Info, UsingMaster)
    this.proverKey = proverKey
      ? new Status(proverKey, Info)
      : new Status(Unknown, Info, UsingMaster)

    const url = BridgeConfig.getParam('tezos-node-url')
    if (url) {
      const [verdict, explanation, lastBlock] = await request(url + '/status')
      this.networkConnection = new Status(url, verdict, explanation)
      this.networkLastBlock = new Status(lastBlock, verdict)
      if (verdict === Ok) {
        // Connected to TEZOS node
        if (masterAccount && masterKey) {
          const keyStore = new tezoslib.keyStores.InMemoryKeyStore()
          await keyStore.setKey(
            networkId,
            masterAccount,
            tezoslib.KeyPair.fromString(masterKey)
          )
          if (clientAccount && clientKey) {
            await keyStore.setKey(
              networkId,
              clientAccount,
              tezoslib.KeyPair.fromString(clientKey)
            )
          }
          if (proverAccount && proverKey) {
            await keyStore.setKey(
              networkId,
              proverAccount,
              tezoslib.KeyPair.fromString(proverKey)
            )
          }
          const tezos = await tezoslib.connect({
            nodeUrl: url,
            networkId,
            masterAccount: masterAccount,
            deps: {
              keyStore: keyStore,
            },
          })
          this.masterAccount = (await verifyAccountGently(tezos, masterAccount))
            ? new Status(masterAccount, Ok, Valid)
            : new Status(masterAccount, Error, Invalid)
          this.masterKey.verdict = this.masterAccount.verdict
          if (clientAccount && clientKey) {
            this.clientAccount = (await verifyAccountGently(
              tezos,
              clientAccount
            ))
              ? new Status(clientAccount, Ok, Valid)
              : new Status(clientAccount, Error, Invalid)
            this.clientKey.verdict = this.clientAccount.verdict
          }
          if (proverAccount && proverKey) {
            this.proverAccount = (await verifyAccountGently(
              tezos,
              proverAccount
            ))
              ? new Status(proverAccount, Ok, Valid)
              : new Status(proverAccount, Error, Invalid)
            this.proverKey.verdict = this.proverAccount.verdict
          }

          const tezosContracts = new TezosContracts()
          await tezosContracts.init(tezos)
          this.contracts = tezosContracts
        }
      }
    } else {
      this.networkConnection = new Status(Unknown)
      this.networkLastBlock = new Status(Unknown)
    }
  }
}

class EthContracts {
  // TODO put it into constructor if possible
  async init(web3) {
    this.ed25519 = await this.checkContract(
      web3,
      BridgeConfig.getParam('eth-ed25519-abi-path'),
      BridgeConfig.getParam('eth-ed25519-address')
    )
    this.erc20 = await this.checkContract(
      web3,
      BridgeConfig.getParam('eth-erc20-abi-path'),
      BridgeConfig.getParam('eth-erc20-address')
    )
    this.locker = await this.checkContract(
      web3,
      BridgeConfig.getParam('eth-locker-abi-path'),
      BridgeConfig.getParam('eth-locker-address')
    )
    this.client = await this.checkContract(
      web3,
      BridgeConfig.getParam('eth-client-abi-path'),
      BridgeConfig.getParam('eth-client-address')
    )
    this.prover = await this.checkContract(
      web3,
      BridgeConfig.getParam('eth-prover-abi-path'),
      BridgeConfig.getParam('eth-prover-address')
    )
  }

  async checkContract(web3, abiPath, address) {
    if (!abiPath) {
      return new Status(Unknown, Error, ABINotFound)
    }
    if (!address) {
      return new Status(Unknown, Error, ContractNotFound)
    }
    try {
      const abi = JSON.parse(fs.readFileSync(abiPath))
      const contract = await new web3.eth.Contract(abi, address)
      if (contract.options.address == address) {
        // TODO #257 check deployed code equality if possible
        return new Status(contract.options.address, Ok, Deployed)
      } else {
        return new Status(address, Error, Invalid)
      }
    } catch (err) {
      return new Status(Unknown, Error, InternalError)
    }
  }
}

class EthStatus {
  // TODO put it into constructor if possible
  async init() {
    const url = BridgeConfig.getParam('eth-node-url')

    const masterKey = BridgeConfig.getParam('eth-master-sk')

    // Init with basic data
    this.masterAccount = new Status(Unknown, Info, NotVerified)
    this.masterKey = masterKey
      ? new Status(normalizeEthKey(masterKey), Info)
      : new Status(Unknown)

    if (url) {
      try {
        const web3 = await new Web3(url)
        const chain = web3.eth.defaultChain ? web3.eth.defaultChain : 'local'
        this.networkLocation = new Status(chain, Info)
        try {
          const version = 'version ' + (await web3.eth.getProtocolVersion())
          const lastBlock = await web3.eth.getBlockNumber()
          this.networkConnection = new Status(url, Ok, version)
          this.networkLastBlock = new Status(lastBlock, Ok)
        } catch (err) {
          this.networkConnection = new Status(url, Error, Unreachable)
          this.networkLastBlock = new Status(Unknown)
        }
        try {
          const masterAccount = await web3.eth.accounts.privateKeyToAccount(
            normalizeEthKey(masterKey)
          )
          const accounts = await web3.eth.getAccounts()
          if (accounts.includes(masterAccount.address)) {
            this.masterAccount = new Status(masterAccount.address, Ok, Valid)
            this.masterKey.verdict = Ok
          } else {
            this.masterAccount = new Status(
              masterAccount.address,
              Error,
              Invalid
            )
            this.masterKey.verdict = Error
          }
        } catch (err) {}

        const ethContracts = new EthContracts()
        await ethContracts.init(web3)
        this.contracts = ethContracts

        try {
          web3.currentProvider.connection.close()
        } catch (err) {}
      } catch (err) {
        this.networkLocation = new Status(Unknown)
        this.networkConnection = new Status(url, Error, Unreachable)
        this.networkLastBlock = new Status(Unknown)
      }
    } else {
      this.networkLocation = new Status(Unknown)
      this.networkConnection = new Status(Unknown)
      this.networkLastBlock = new Status(Unknown)
    }
  }
}

class ServicesStatus {
  async init() {
    this.eth2tezosRelay = await this.running('eth2tezos-relay')
    this.tezos2ethRelay = await this.running('tezos2eth-relay')
    this.watchdog = await this.running('bridge-watchdog')
  }

  processArgs(args) {
    var res = []
    for (var i = 0; i + 1 < args.length; i++) {
      if (args[i].startsWith('--')) {
        res.push(args[i].substring(2, args[i].length) + '=' + args[i + 1])
      }
    }
    return res.join(', ')
  }

  async running(serviceName) {
    let status
    try {
      const process = await ProcessManager.describe(serviceName)
      if (process.length) {
        status = new Status(
          Running,
          Ok,
          this.processArgs(process[0].pm2_env.args)
        )
      } else {
        status = new Status(Unknown, Error, Unreachable)
      }
    } catch (err) {
      status = new Status(Unknown, Error, InternalError)
    }
    return status
  }
}

// TODO put it into StatusCommand class if possible
function printHeader(text) {
  console.log('\x1B[33m' + text + NoColor)
}

function printLine(field, status = null) {
  if (!status) {
    status = new Status(Unknown, Error, RecordNotFound)
  }
  var color = '\x1B[35m'
  switch (status.verdict) {
    case Ok:
      var color = '\x1B[32m'
      break
    case Info:
      var color = '\x1B[39m'
      break
    case Warn:
      var color = '\x1B[33m'
      break
    case Error:
      var color = '\x1B[35m'
      break
  }
  const explanation = status.explanation ? '(' + status.explanation + ')' : ''
  var line = field + ':'
  while (line.length < 50) {
    line = line + ' '
  }
  console.log(line, color + status.value, explanation + NoColor)
}

function printFooter() {
  console.log()
}

class StatusCommand {
  static async execute() {
    const consoleError = console.error
    // A cool hack to avoid annoying Web3 printing to stderr
    console.error = function () {}

    const tezosStatus = new TezosStatus()
    await tezosStatus.init()

    const ethStatus = new EthStatus()
    await ethStatus.init()

    const servicesStatus = new ServicesStatus()
    await servicesStatus.init()

    // Return console.error back
    console.error = consoleError

    printHeader('TEZOS node status')
    printLine('Location', tezosStatus.networkLocation)
    printLine('Connection', tezosStatus.networkConnection)
    printLine('Latest block height', tezosStatus.networkLastBlock)
    printLine('Bridge master account', tezosStatus.masterAccount)
    printLine('Master account secret key', tezosStatus.masterKey)
    printLine(
      'Account used for Client contract deployment',
      tezosStatus.clientAccount
    )
    printLine('Client account secret key', tezosStatus.clientKey)
    printLine(
      'Account used for Prover contract deployment',
      tezosStatus.proverAccount
    )
    printLine('Prover account secret key', tezosStatus.proverKey)
    printFooter()

    printHeader('TEZOS contracts status')
    if (tezosStatus.contracts) {
      printLine('fungible token', tezosStatus.contracts.funToken)
      printLine('client', tezosStatus.contracts.client)
      printLine('prover', tezosStatus.contracts.prover)
    } else {
      printLine('Contracts')
    }
    printFooter()

    printHeader('ETH node status')
    printLine('Location', ethStatus.networkLocation)
    printLine('Connection', ethStatus.networkConnection)
    printLine('Latest block height', ethStatus.networkLastBlock)
    printLine('Bridge master account', ethStatus.masterAccount)
    printLine('Master account secret key', ethStatus.masterKey)
    printFooter()

    printHeader('ETH contracts status')
    if (ethStatus.contracts) {
      printLine('ed25519', ethStatus.contracts.ed25519)
      printLine('erc20', ethStatus.contracts.erc20)
      printLine('locker', ethStatus.contracts.locker)
      printLine('client', ethStatus.contracts.client)
      printLine('prover', ethStatus.contracts.prover)
    } else {
      printLine('Contracts')
    }
    printFooter()

    printHeader('Services')
    printLine('ETH-2-TEZOS relay', servicesStatus.eth2tezosRelay)
    printLine('TEZOS-2-ETH relay', servicesStatus.tezos2ethRelay)
    printLine('Bridge Watchdog', servicesStatus.watchdog)

    ProcessManager.disconnect()
  }
}

exports.StatusCommand = StatusCommand
