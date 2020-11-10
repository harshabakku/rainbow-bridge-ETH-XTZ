#!/usr/bin/env node

const path = require('path')
const fs = require('fs')

async function main() {
  let packageJson = require(path.join(__dirname, '../package.json'))
  if (process.env.PATCH_RAINBOW_BRIDGE_SOL) {
    packageJson.dependencies[
      'tez-bridge-sol'
    ] = `tezos/tez-bridge-sol#${process.env.PATCH_RAINBOW_BRIDGE_SOL}`
  }
  if (process.env.PATCH_RAINBOW_BRIDGE_RS) {
    packageJson.dependencies[
      'tez-bridge-rs'
    ] = `tezos/tez-bridge-rs#${process.env.PATCH_RAINBOW_BRIDGE_RS}`
  }
  if (process.env.PATCH_RAINBOW_BRIDGE_LIB) {
    packageJson.dependencies[
      'tez-bridge-lib'
    ] = `tezos/tez-bridge-lib#${process.env.PATCH_RAINBOW_BRIDGE_LIB}`
  }
  if (process.env.PATCH_TOKEN_CONNECTOR) {
    packageJson.dependencies[
      'tezbridge-token-connector'
    ] = `tezos/tezbridge-token-connector#${process.env.PATCH_TOKEN_CONNECTOR}`
  }
  console.log('Contract versions:')
  console.log(
    `tez-bridge-sol: ${packageJson.dependencies['tez-bridge-sol']}`
  )
  console.log(
    `tez-bridge-rs: ${packageJson.dependencies['tez-bridge-rs']}`
  )
  console.log(
    `tez-bridge-lib: ${packageJson.dependencies['tez-bridge-lib']}`
  )
  console.log(
    `tezbridge-token-connector: ${packageJson.dependencies['tezbridge-token-connector']}`
  )
  if (
    !process.env.PATCH_RAINBOW_BRIDGE_SOL &&
    !process.env.PATCH_RAINBOW_BRIDGE_RS &&
    !process.env.PATCH_RAINBOW_BRIDGE_LIB &&
    !process.env.PATCH_TOKEN_CONNECTOR
  ) {
    process.exit()
  }

  fs.writeFileSync(
    path.join(__dirname, '../package.json'),
    JSON.stringify(packageJson)
  )
}

main()
