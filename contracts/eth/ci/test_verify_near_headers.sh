 #!/bin/bash
set -euo pipefail

CI_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
ROOT_DIR=$CI_DIR/..

mkdir -p $ROOT_DIR/testdata
cd $ROOT_DIR/testdata
curl https://s3-us-west-1.amazonaws.com/tez-bridge.tezosprotocol.com/test-data/tezos-headers.tar.gz -o tezos-headers.tar.gz
tar zxf tezos-headers.tar.gz

cd $ROOT_DIR
yarn

cd $ROOT_DIR/tezosbridge
yarn
TEZOS_HEADERS_DIR=$ROOT_DIR/testdata/tezos-headers yarn test
