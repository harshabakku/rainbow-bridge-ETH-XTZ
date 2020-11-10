const ProcessManager = require('pm2')
const { spawnProcess } = require('./helpers')
const { Watchdog } = require('tez-bridge-lib/watchdog')
const { BridgeConfig } = require('tez-bridge-lib/config')
const path = require('path')
const os = require('os')

class StartWatchdogCommand {
  static async execute() {
    if (BridgeConfig.getParam('daemon') === 'true') {
      ProcessManager.connect((err) => {
        if (err) {
          console.log(
            'Unable to connect to the ProcessManager daemon! Please retry.'
          )
          return
        }
        spawnProcess('bridge-watchdog', {
          name: 'bridge-watchdog',
          script: path.join(__dirname, '../../index.js'),
          interpreter: 'node',
          error_file: '~/.tezbridge/logs/watchdog/err.log',
          out_file: '~/.tezbridge/logs/watchdog/out.log',
          args: [
            'start',
            'bridge-watchdog',
            ...BridgeConfig.getArgsNoDaemon(),
          ],
          logDateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
        })
      })
    } else {
      const watchdog = new Watchdog()
      await watchdog.initialize()
      await watchdog.run()
    }
  }
}

exports.StartWatchdogCommand = StartWatchdogCommand
