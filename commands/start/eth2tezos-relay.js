const ProcessManager = require('pm2')
const { spawnProcess } = require('./helpers')
const { Eth2TezosRelay } = require('../../lib/eth2tezos-relay')
// const {
//   EthOnTezosClientContract,
// } = require('tez-bridge-lib/eth-on-tezos-client')
const { BridgeConfig } = require('tez-bridge-lib/config')
const path = require('path')
const os = require('os')
const { TezosToolkit } = require("@taquito/taquito")
const BigNumber = require('bignumber.js');


class StartEth2TezosRelayCommand {
  static async execute() {
    // if (BridgeConfig.getParam('daemon') === 'true') {
    //   console.log("tezbridge config param daemon true ")
    //   ProcessManager.connect((err) => {
    //     if (err) {
    //       console.log(
    //         'Unable to connect to the ProcessManager daemon! Please retry.'
    //       )
    //       return
    //     }
    //     spawnProcess('eth2tezos-relay', {
    //       name: 'eth2tezos-relay',
    //       script: path.join(__dirname, '../../index.js'),
    //       interpreter: 'node',
    //       error_file: '~/.tezbridge/logs/eth2tezos-relay/err.log',
    //       out_file: '~/.tezbridge/logs/eth2tezos-relay/out.log',
    //       args: ['start', 'eth2tezos-relay', ...BridgeConfig.getArgsNoDaemon()],
    //       wait_ready: true,
    //       kill_timeout: 60000,
    //       logDateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    //     })
    //   })
    // } else {
    //   console.log("tezbridge config param daemon false ")

      // Below are tezos node details that should be replaced with tezos node details 
      
      // const masterAccount = BridgeConfig.getParam('tezos-master-account')
      // const masterSk = BridgeConfig.getParam('tezos-master-sk')
      // const keyStore = new tezoslib.keyStores.InMemoryKeyStore()
      // await keyStore.setKey(
        //   BridgeConfig.getParam('tezos-network-id'),
        //   masterAccount,
        //   tezoslib.KeyPair.fromString(masterSk)
        // )
        // const tezos = await tezoslib.connect({
          //   nodeUrl: BridgeConfig.getParam('tezos-node-url'),
          //   networkId: BridgeConfig.getParam('tezos-network-id'),
          //   masterAccount: masterAccount,
          //   deps: {
            //     keyStore: keyStore,
            //   },
            // })
            // 
             const relay = new Eth2TezosRelay()
            // below should be replaced from  eth-on-tezos client to eth-on-xtz client contract on tezos
            
            // const clientContract = new EthOnTezosClientContract(
              //   new tezoslib.Account(tezos.connection, masterAccount),
              //   BridgeConfig.getParam('tezos-client-account')
              // )
              // await clientContract.accessKeyInit()
      
      // const rpcUrl = 'http://localhost:20000';
      // console.log("connecting to Tezos chain: "+ rpcUrl)

      
      // const Tezos = new TezosToolkit(rpcUrl);
      // Tezos.setProvider({ signer: new InMemorySigner() }); //not needed  
      
    //   Tezos.contract.at('KT1HhcQDxNzhKsrVY5oQbUnwGm3LZ3hg2x9i')
    //   .then(contract => {
    //     const i = 7;
    // console.log("connected to contract")
    // console.log(contract.storage())
        
    //   })      
    //   .catch(error => console.log(`Error: ${JSON.stringify(error, null, 2)}`));



    //  const clientContract = await Tezos.contract.at('KT1NtfRSs3AirQwTarhKBz8nDmbV4HZgukah')
    //  const storage = await clientContract.storage()
    //  console.log(storage)
    //  console.log ( "ethClient contract storage value "+ new BigNumber(storage.latest_block).toString())

    const clientContract = null;
      console.log('Initializing eth2tezos-relay...')
      relay.initialize(clientContract, BridgeConfig.getParam('eth-node-url'))
      console.log('Starting eth2tezos-relay...')
      await relay.run()
    }
  }
// }

exports.StartEth2TezosRelayCommand = StartEth2TezosRelayCommand
