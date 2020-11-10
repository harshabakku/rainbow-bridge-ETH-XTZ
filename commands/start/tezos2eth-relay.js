const ProcessManager = require('pm2')
const { spawnProcess } = require('./helpers')
const { Tezos2EthRelay } = require('tez-bridge-lib/tezos2eth-relay')
const { BridgeConfig } = require('tez-bridge-lib/config')
const path = require('path')
const os = require('os')

class StartTezos2EthRelayCommand {
  static async execute() {
    if (BridgeConfig.getParam('daemon') === 'true') {
      ProcessManager.connect((err) => {
        if (err) {
          console.log(
            'Unable to connect to the ProcessManager daemon! Please retry.'
          )
          return
        }
        spawnProcess('tezos2eth-relay', {
          name: 'tezos2eth-relay',
          script: path.join(__dirname, '../../index.js'),
          interpreter: 'node',
          error_file: '~/.tezbridge/logs/tezos2eth-relay/err.log',
          out_file: '~/.tezbridge/logs/tezos2eth-relay/out.log',
          args: ['start', 'tezos2eth-relay', ...BridgeConfig.getArgsNoDaemon()],
          wait_ready: true,
          kill_timeout: 60000,
          logDateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
        })
      })
    } else {
      const relay = new Tezos2EthRelay()
      await relay.initialize()
      await relay.run()
    }
  }
}

exports.StartTezos2EthRelayCommand = StartTezos2EthRelayCommand
