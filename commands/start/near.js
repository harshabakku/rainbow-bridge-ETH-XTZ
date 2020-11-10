const util = require('util')
const { execSync } = require('child_process')
const request = require('request')
const { getLocalTezosNodeURL } = require('./helpers')
const { RainbowConfig } = require('rainbow-bridge-lib/config')

class StartLocalTezosNodeCommand {
  static execute() {
    const command = util.format(
      'python3 ~/.rainbow/tezosup/main.py localnet --num-nodes 1 --binary-path %s',
      '~/.rainbow/core/target/debug'
    )
    request(getLocalTezosNodeURL(), { json: true }, (err, _res, _body) => {
      if (err) {
        console.log(execSync(command).toString())
      } else {
        console.log('Local Node is already running. Skipping...')
      }
    })
    RainbowConfig.setParam('tezos-node-url', 'http://localhost:3030')
    RainbowConfig.setParam('tezos-network-id', 'local')
    RainbowConfig.setParam('tezos-master-account', 'node0')
    RainbowConfig.setParam(
      'tezos-master-sk',
      'ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP'
    )
    RainbowConfig.saveConfig()
  }
}

exports.StartLocalTezosNodeCommand = StartLocalTezosNodeCommand
