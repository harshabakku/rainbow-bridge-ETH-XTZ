const ProcessManager = require('pm2')
const nearlib = require('near-api-js')
const { spawnProcess } = require('./helpers')
const { Eth2NearRelay } = require('../../lib/eth2near-relay')
const {
  EthOnNearClientContract,
} = require('rainbow-bridge-lib/eth-on-near-client')
const { RainbowConfig } = require('rainbow-bridge-lib/config')
const path = require('path')
const os = require('os')
const { TezosToolkit } = require("@taquito/taquito")
const BigNumber = require('bignumber.js');


class StartEth2NearRelayCommand {
  static async execute() {
    // if (RainbowConfig.getParam('daemon') === 'true') {
    //   console.log("rainbow config param daemon true ")
    //   ProcessManager.connect((err) => {
    //     if (err) {
    //       console.log(
    //         'Unable to connect to the ProcessManager daemon! Please retry.'
    //       )
    //       return
    //     }
    //     spawnProcess('eth2near-relay', {
    //       name: 'eth2near-relay',
    //       script: path.join(__dirname, '../../index.js'),
    //       interpreter: 'node',
    //       error_file: '~/.rainbow/logs/eth2near-relay/err.log',
    //       out_file: '~/.rainbow/logs/eth2near-relay/out.log',
    //       args: ['start', 'eth2near-relay', ...RainbowConfig.getArgsNoDaemon()],
    //       wait_ready: true,
    //       kill_timeout: 60000,
    //       logDateFormat: 'YYYY-MM-DD HH:mm:ss.SSS',
    //     })
    //   })
    // } else {
    //   console.log("rainbow config param daemon false ")

      // Below are near node details that should be replaced with tezos node details 
      
      // const masterAccount = RainbowConfig.getParam('near-master-account')
      // const masterSk = RainbowConfig.getParam('near-master-sk')
      // const keyStore = new nearlib.keyStores.InMemoryKeyStore()
      // await keyStore.setKey(
        //   RainbowConfig.getParam('near-network-id'),
        //   masterAccount,
        //   nearlib.KeyPair.fromString(masterSk)
        // )
        // const near = await nearlib.connect({
          //   nodeUrl: RainbowConfig.getParam('near-node-url'),
          //   networkId: RainbowConfig.getParam('near-network-id'),
          //   masterAccount: masterAccount,
          //   deps: {
            //     keyStore: keyStore,
            //   },
            // })
            // 
             const relay = new Eth2NearRelay()
            // below should be replaced from  eth-on-near client to eth-on-xtz client contract on tezos
            
            // const clientContract = new EthOnNearClientContract(
              //   new nearlib.Account(near.connection, masterAccount),
              //   RainbowConfig.getParam('near-client-account')
              // )
              // await clientContract.accessKeyInit()
      
      const rpcUrl = 'http://localhost:20000';
      console.log("connecting to Tezos chain: "+ rpcUrl)

      
      const Tezos = new TezosToolkit(rpcUrl);
      // Tezos.setProvider({ signer: new InMemorySigner() });  
      
    //   Tezos.contract.at('KT1HhcQDxNzhKsrVY5oQbUnwGm3LZ3hg2x9i')
    //   .then(contract => {
    //     const i = 7;
    // console.log("connected to contract")
    // console.log(contract.storage())
        
    //   })      
    //   .catch(error => console.log(`Error: ${JSON.stringify(error, null, 2)}`));



     const clientContract = await Tezos.contract.at('KT1HhcQDxNzhKsrVY5oQbUnwGm3LZ3hg2x9i')
     const storage = await clientContract.storage()
     console.log(storage)
     console.log ( "ethClient contract storage value "+ new BigNumber(storage.number).toString())

    // const clientContract = null;
      console.log('Initializing eth2near-relay...')
      relay.initialize(clientContract, RainbowConfig.getParam('eth-node-url'))
      console.log('Starting eth2near-relay...')
      await relay.run()
    }
  }
// }

exports.StartEth2NearRelayCommand = StartEth2NearRelayCommand
