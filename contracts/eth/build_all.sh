#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -ex

echo "Building TezosOnEthClient and ED25519 contracts"
cd tezosbridge
./dist.sh

echo "Building TezosOnEthProver contract"
cd ../tezosprover
./dist.sh
