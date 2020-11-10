const ProcessManager = require('pm2')
const { Tezos2EthRelay } = require('rainbow-bridge-lib/tezos2eth-relay')

class DangerSubmitInvalidTezosBlock {
  static async execute() {
    const relay = new Tezos2EthRelay()
    await relay.initialize()
    await relay.DANGER_submitInvalidTezosBlock()
  }
}

exports.DangerSubmitInvalidTezosBlock = DangerSubmitInvalidTezosBlock
