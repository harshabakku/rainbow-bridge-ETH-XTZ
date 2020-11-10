#!/bin/bash
# This test launch all commands, but postpone start eth2tezos-relay late to test it catch fast

set -exuo pipefail

CI_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/tmp/ganache.out 2>&1 && pwd )"
ROOT_DIR=$CI_DIR/..

cd $ROOT_DIR
yarn
node index.js clean
if [ -n "${LOCAL_CORE_SRC+x}" ]; then
  node index.js prepare --core-src "$LOCAL_CORE_SRC"
else
  node index.js prepare
fi
node index.js start tezos-node
export GANACHE_BLOCK_TIME=3
node index.js start ganache
# Wait for the local node to start
while ! curl localhost:3030; do
  sleep 1
done

while ! curl localhost:9545; do
  sleep 1
done

node index.js init-tezos-contracts
node index.js init-eth-ed25519
# Use short lockup time for tests
node index.js init-eth-client --eth-client-lock-eth-amount 1000000000000000000 --eth-client-lock-duration 10
node index.js init-eth-prover
node index.js init-eth-erc20
node index.js init-eth-locker
node index.js init-tezos-token-factory
# First start pm2 daemon
yarn run pm2 ping
sleep 5
yarn run pm2 list
node index.js start tezos2eth-relay --eth-master-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201
sleep 5
yarn run pm2 list
sleep 100
node index.js start eth2tezos-relay
sleep 5
yarn run pm2 list
node index.js transfer-eth-erc20-to-tezos --amount 1000 \
--eth-sender-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 \
--tezos-receiver-account rainbow_bridge_eth_on_tezos_prover --tezos-master-account rainbow_bridge_eth_on_tezos_prover \
2>&1 | tee -a /tmp/eth2tezostransfer.out
grep "Balance of rainbow_bridge_eth_on_tezos_prover after the transfer is 1000" /tmp/eth2tezostransfer.out
node index.js transfer-eth-erc20-from-tezos --amount 1 --tezos-sender-account rainbow_bridge_eth_on_tezos_prover \
--tezos-sender-sk ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP \
--eth-receiver-address 0xEC8bE1A5630364292E56D01129E8ee8A9578d7D8 \
2>&1 | tee -a /tmp/tezos2ethtransfer.out
grep "after the transfer: 1" /tmp/tezos2ethtransfer.out
