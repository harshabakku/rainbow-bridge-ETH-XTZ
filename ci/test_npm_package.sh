#!/bin/bash
# This test install current package as if current package is published to npm
# And verify everything of the npm package is good. It should pass before publish
# npm package

set -exuo pipefail

CI_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/tmp/ganache.out 2>&1 && pwd )"
ROOT_DIR=$CI_DIR/..

cd ${ROOT_DIR}
rm -f ./tez-bridge-cli-*.tgz
npm pack
rm -rf testenv
mkdir testenv
cd testenv
#mkdir -p /var/lib/buildkite-agent/.tezbridge/logs
#mkdir -p /var/lib/buildkite-agent/.pm2
#touch /var/lib/buildkite-agent/.pm2/pm2.log
npm init -y > /dev/null
npm i ${ROOT_DIR}/tez-bridge-cli-*.tgz
export PATH=${ROOT_DIR}/testenv/node_modules/.bin:$PATH
cd ..

tezbridge clean
if [ -n "${LOCAL_CORE_SRC+x}" ]; then
  tezbridge prepare --core-src "$LOCAL_CORE_SRC"
else
  tezbridge prepare
fi

tezbridge start tezos-node
tezbridge start ganache

# Wait for the local node to start
while ! curl localhost:3030; do
  sleep 1
done

while ! curl localhost:9545; do
  sleep 1
done

tezbridge init-tezos-contracts
tezbridge init-eth-ed25519
# Use short lockup time for tests
tezbridge init-eth-client --eth-client-lock-eth-amount 1e18 --eth-client-lock-duration 30
tezbridge init-eth-prover
tezbridge init-eth-erc20
tezbridge init-eth-locker
tezbridge init-tezos-token-factory
# First start pm2 daemon
cd ${ROOT_DIR}/testenv/
yarn pm2 ping
sleep 5
yarn pm2 list
tezbridge start tezos2eth-relay --eth-master-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501201
sleep 5
yarn pm2 list
tezbridge start eth2tezos-relay
sleep 5
yarn pm2 list
tezbridge transfer-eth-erc20-to-tezos --amount 1000 \
--eth-sender-sk 0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200 \
--tezos-receiver-account tez_bridge_eth_on_tezos_prover --tezos-master-account tez_bridge_eth_on_tezos_prover \
2>&1 | tee -a /tmp/eth2tezostransfer.out
grep "Balance of tez_bridge_eth_on_tezos_prover after the transfer is 1000" /tmp/eth2tezostransfer.out
tezbridge transfer-eth-erc20-from-tezos --amount 1 --tezos-sender-account tez_bridge_eth_on_tezos_prover \
--tezos-sender-sk ed25519:3D4YudUQRE39Lc4JHghuB5WM8kbgDDa34mnrEP5DdTApVH81af7e2dWgNPEaiQfdJnZq1CNPp5im4Rg5b733oiMP \
--eth-receiver-address 0xEC8bE1A5630364292E56D01129E8ee8A9578d7D8 \
2>&1 | tee -a /tmp/tezos2ethtransfer.out
grep "after the transfer: 1" /tmp/tezos2ethtransfer.out
