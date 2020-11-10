const ProcessManager = require('pm2')
const { spawnProcess } = require('./helpers')
const { BridgeConfig } = require('tez-bridge-lib/config')
const path = require('path')
const os = require('os')

class StartGanacheNodeCommand {
  static async execute() {
    ProcessManager.connect((err) => {
      if (err) {
        console.log(
          'Unable to connect to the ProcessManager daemon! Please retry.'
        )
        return
      }
      spawnProcess('ganache', {
        name: 'ganache',
        script: path.join(__dirname, '../../scripts/start_ganache.sh'),
        error_file: '~/.tezbridge/logs/ganache/err.log',
        out_file: '~/.tezbridge/logs/ganache/out.log',
        args: [],
        env: process.env,
        logDateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
      })
    })
    BridgeConfig.setParam('eth-node-url', 'ws://localhost:9545')
    BridgeConfig.setParam(
      'eth-master-sk',
      '0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200'
    )
    BridgeConfig.setParam('tezos-client-validate-ethash', 'false')
    BridgeConfig.saveConfig()
  }
}

exports.StartGanacheNodeCommand = StartGanacheNodeCommand
