#!/bin/bash
set -euo pipefail

eval RAINBOW_DIR=~/.tezbridge

export LOCAL_CORE_SRC
export LOCAL_TEZOSUP_SRC

eval CORE_SRC=~/.tezbridge/core
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" 2>&1 && pwd )"
eval BRIDGE_SRC=${SCRIPTS_DIR}/..
eval LIBS_SOL_SRC=${BRIDGE_SRC}/node_modules/tez-bridge-sol
eval LIBS_RS_SRC=${BRIDGE_SRC}/node_modules/tez-bridge-rs
eval TEZOSUP_SRC=~/.tezbridge/tezosup
eval TEZOSUP_LOGS=~/.tezosup/localnet-logs

mkdir -p $RAINBOW_DIR
mkdir -p $RAINBOW_DIR/logs/ganache
mkdir -p $RAINBOW_DIR/logs/tezos2eth-relay
mkdir -p $RAINBOW_DIR/logs/eth2tezos-relay
mkdir -p $RAINBOW_DIR/logs/watchdog
touch $RAINBOW_DIR/logs/ganache/out.log
touch $RAINBOW_DIR/logs/ganache/err.log
touch $RAINBOW_DIR/logs/tezos2eth-relay/out.log
touch $RAINBOW_DIR/logs/tezos2eth-relay/err.log
touch $RAINBOW_DIR/logs/eth2tezos-relay/out.log
touch $RAINBOW_DIR/logs/eth2tezos-relay/err.log
touch $RAINBOW_DIR/logs/watchdog/out.log
touch $RAINBOW_DIR/logs/watchdog/err.log

if test -z "$LOCAL_CORE_SRC"
then
echo "tezos-core home not specified..."
git clone "https://github.com/tezosprotocol/tezoscore" $CORE_SRC
eval CURR_DIR=$(pwd)
cd $CURR_DIR
else
echo "Linking the specified local repo from ${LOCAL_CORE_SRC} to ${CORE_SRC}"
ln -s $LOCAL_CORE_SRC $CORE_SRC
fi

if test -z "$LOCAL_TEZOSUP_SRC"
then
echo "tezosup home not specified..."
git clone "https://github.com/tezos/tezosup/" $TEZOSUP_SRC
else
echo "Linking the specified local repo from ${LOCAL_TEZOSUP_SRC} to ${TEZOSUP_SRC}"
ln -s $LOCAL_TEZOSUP_SRC $TEZOSUP_SRC
fi
mkdir -p $TEZOSUP_LOGS

cd $CORE_SRC
cargo build --package tezosd --bin tezosd
echo "Compiled source of tezoscore"

cd $BRIDGE_SRC
# In local development, this update ethashproof repo
# In npm package, this is safely ignored and ethashproof src is packaged
git submodule update --init --recursive

yarn
echo "Installed CLI dependencies"

cd $BRIDGE_SRC/vendor/ganache
yarn
echo "Installed ganache-cli"

cd $BRIDGE_SRC/vendor/ethashproof
./build.sh
echo 'Compiled ethashproof module'

# Start the pm2 daemon if it is currently not running.
yarn pm2 ping
