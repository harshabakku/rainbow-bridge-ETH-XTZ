const { execSync } = require('child_process')
const ProcessManager = require('pm2')
const { existsSync } = require('fs')
const { homedir } = require('os')
const path = require('path')

class CleanCommand {
  static execute() {
    console.log('Stopping all the running processes...')
    ProcessManager.connect((err) => {
      if (err) {
        // Never happened, but just log in case
        console.log('Failed to launch pm2 daemon')
      }
      ProcessManager.killDaemon((err) => {
        if (err) {
          console.log(`Error stopping pm2 processes. ${err}`)
          process.exit(1)
        }
        ProcessManager.disconnect()
        if (existsSync(path.join(homedir(), '.tezbridge', 'tezosup', 'main.py'))) {
          try {
            console.log('Stopping tezosup')
            execSync('python3 ~/.tezbridge/tezosup/main.py stop')
          } catch (err) {
            console.log(`Error stopping tezosup ${err}`)
          }
        }
        console.log('Cleaning ~/.tezbridge and ~/.tezos/localnet directory...')
        execSync('rm -rf ~/.tezbridge ~/.tezos/localnet')
        execSync('rm -f /tmp/tezos2ethtransfer.out /tmp/eth2tezostransfer.out')
        console.log('Cleaning done...')
        process.exit(0)
      })
    })
  }
}

exports.CleanCommand = CleanCommand
