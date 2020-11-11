 #!/bin/bash
set -euo pipefail

CI_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR=$CI_DIR/..

mkdir -p $ROOT_DIR/testdata
cd $ROOT_DIR/testdata
curl https://s3-us-west-1.amazonaws.com/tez-bridge.tezosprotocol.com/test-data/tezos-proofs.tar.gz -o tezos-proofs.tar.gz
tar zxf tezos-proofs.tar.gz

cd $ROOT_DIR
yarn

cd $ROOT_DIR/tezosprover
yarn
TEZOS_PROOFS_DIR=$ROOT_DIR/testdata/tezos-proofs yarn test
