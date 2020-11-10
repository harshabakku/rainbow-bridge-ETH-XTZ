const ProcessManager = require('pm2-promise')
const { execSync } = require('child_process')

async function stopLocalTezosNode() {
  console.log('Stopping tezos node')
  const command = 'python3 ~/.rainbow/tezosup/main.py stop'
  try {
    execSync(command)
    console.log('tezos node successfully stopped')
  } catch (err) {
    console.log('Error stopping local tezos node', err)
  }
}

async function stop(serviceName) {
  try {
    console.log('Stopping', serviceName)
    await ProcessManager.delete(serviceName)
    console.log(serviceName, 'successfully stopped')
  } catch (err) {
    if (
      err.message &&
      err.message.indexOf('process or namespace not found') >= 0
    ) {
      console.log(serviceName, 'already stopped')
    } else {
      console.log(
        serviceName,
        'error stopping the process due to:',
        err.message
      )
    }
  }
}

class StopManagedProcessCommand {
  static async execute(command) {
    const serviceName = command._name

    const consoleError = console.error
    // A cool hack to avoid annoying pm2 printing to stderr
    console.error = function() {}

    if (serviceName === 'tezos-node') {
      await stopLocalTezosNode()
    } else if (serviceName === 'all') {
      await stopLocalTezosNode()
      for (const serviceName of [
        'ganache',
        'eth2tezos-relay',
        'tezos2eth-relay',
        'bridge-watchdog',
      ]) {
        await stop(serviceName)
        await ProcessManager.disconnect()
      }
    } else {
      await stop(serviceName)
      await ProcessManager.disconnect()
    }

    // Return console.error back
    console.error = consoleError
  }
}

exports.StopManagedProcessCommand = StopManagedProcessCommand
