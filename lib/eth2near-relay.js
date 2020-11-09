const path = require('path')
const os = require('os')
const exec = require('child_process').exec
const utils = require('ethereumjs-util')
const BN = require('bn.js')
const { RobustWeb3, sleep } = require('rainbow-bridge-lib/rainbow/robust')
const { txnStatus } = require('rainbow-bridge-lib/rainbow/borsh')
const { web3BlockToRlp } = require('rainbow-bridge-lib/eth2near-relay')
const MAX_SUBMIT_BLOCK = 10
const BRIDGE_SRC_DIR = path.join(__dirname, '..')
const BigNumber = require('bignumber.js');

const { TezosToolkit } = require("@taquito/taquito")
const { InMemorySigner } = require("@taquito/signer")

const ethClientContractAddress = 'KT1LGWCrePidXoH85BgGgnoyuwX9hBy9iKbx';

function execute(command, _callback) {
  return new Promise((resolve) =>
    exec(command, (error, stdout, _stderr) => {
      if (error) {
        console.log(error)
      }
      resolve(stdout)
    })
  )
}

class Eth2NearRelay {
  initialize(ethClientContract, ethNodeURL, tezos) {
    this.ethClientContract = ethClientContract
    // @ts-ignore
    this.robustWeb3 = new RobustWeb3(ethNodeURL)
    this.web3 = this.robustWeb3.web3
     
    const rpcUrl = 'https://carthagenet.smartpy.io';
    console.log("connecting to Tezos chain: "+ rpcUrl)
    this.Tezos = new TezosToolkit(rpcUrl);
    this.Tezos.setProvider({ signer: new InMemorySigner("edskS55BvqKJeVQKKxLRyqdbWenmPkPoPna4T2J7GWVmC96sE9pvyVK7iHvinVqVzSNe7qGpiVzfv3Fjv48YaUu9i5Z5bPErfR") }); //needed to make txs   


    


  }

  async run() {
    const robustWeb3 = this.robustWeb3

  

    while (true) {
      let clientBlockNumber 
      let chainBlockNumber
      try {
        // Even retry 10 times ethClientContract.last_block_number could still fail
        // Return back to loop to avoid crash eth2near-relay.
       
        chainBlockNumber = await robustWeb3.getBlockNumber()
        console.log('ETH Chain block-number: ' + chainBlockNumber)
        
        
        this.ethClientContract = await this.Tezos.contract.at(ethClientContractAddress)
        const ethClientStorage = await this.ethClientContract.storage()
        clientBlockNumber = new BigNumber(ethClientStorage.latest_block).toNumber();
        console.log('ETH Client Contract on Tezos Chain block-number: ' + clientBlockNumber+ ' best-header-hash: '+ ethClientStorage.header_hash )
        // console.log(ethClientStorage.canonical_header_hashes)

         

      } catch (e) {
        console.log(e)
        continue
      }

      // Backtrack if chain switched the fork.
      // while (true) {
        // try {
        //   const chainBlock = await robustWeb3.getBlock(clientBlockNumber)
        //   const chainBlockHash = chainBlock.hash
        //   const clientHashes = await this.ethClientContract.known_hashes(
        //     clientBlockNumber
        //   )
        //   if (clientHashes.find((x) => x === chainBlockHash)) {
        //     // break
        //   } else {
        //     console.log(
        //       `Block ${chainBlockHash} height: ${clientBlockNumber} is not known to the client. Backtracking.`
        //     )
        //     clientBlockNumber -= 1
        //   }
        // } catch (e) {
        //   console.log(e)
        //   // continue
        // }
      // }

      if (clientBlockNumber < chainBlockNumber) {
        try {
          // Submit add_block txns
          let blockPromises = []
          let endBlock = Math.min(
            clientBlockNumber + MAX_SUBMIT_BLOCK,
            chainBlockNumber
          )
          // console.log("endBlock "+ endBlock)
          // console.log(clientBlockNumber)
          if (clientBlockNumber < 5) {
            // Initially, do not add block concurrently
            endBlock = clientBlockNumber + 1
            console.log("endBlock "+ endBlock)
          }
          
          for (let i = clientBlockNumber + 1; i <= endBlock; i++) {
            blockPromises.push(this.getParseBlock(i))
          }
          let blocks = await Promise.all(blockPromises)
          console.log(
            `Got and parsed block ${clientBlockNumber + 1} to block ${endBlock}`
          )

          let txHashes = []
          for (let i = clientBlockNumber + 1, j = 0; i <= endBlock; i++, j++) {
            txHashes.push(await this.submitBlock(blocks[j], i))
          }

          console.log(
            `Submitted txn to add block ${
              clientBlockNumber + 1
            } to block ${endBlock}`
          )

          // Wait add_block txns commit
          await Promise.all(
            txHashes.map((txHash) =>
               txnStatus(this.ethClientContract.account, txHash, 10, 2000)
            )
          )
          console.log(
            `Success added block ${clientBlockNumber + 1} to block ${endBlock}`
          )
        } catch (e) {
          console.log(e)
        }
      } else {
        await sleep(10000)
      }
    }
  }

  async getParseBlock(blockNumber) {
    try {
      const blockRlp = this.web3.utils.bytesToHex(
        web3BlockToRlp(await this.robustWeb3.getBlock(blockNumber))
      )
      // console.log("blockRlp: "+ blockRlp);

      //ethhashproof here takes a blockRlp(header rlp) and returns header-rlp, merkleroot, elements, and proofs as parsedBlock  
      const unparsedBlock = await execute(
        `${BRIDGE_SRC_DIR}/vendor/ethashproof/cmd/relayer/relayer ${blockRlp} | sed -e '1,/Json output/d'`
      )
      
       console.log(' ethhashproof call to process blockRlp  ------------------')
      // console.log("unparsed block: "+  unparsedBlock)
      const parsedBlock = JSON.parse(unparsedBlock)
      return parsedBlock
    } catch (e) {
      console.log(`Failed to get or parse block ${blockNumber}: ${e}`)
    }
  }

  async submitBlock(block, blockNumber) {
    const h512s = block.elements
      .filter((_, index) => index % 2 === 0)
      .map((element, index) => {
        return (
          this.web3.utils.padLeft(element, 64) +
          this.web3.utils.padLeft(block.elements[index * 2 + 1], 64).substr(2)
        )
      })


    //dag elements used and rest of merkle proofs that are needed to be provided to arrive at merkle root of dag file used  
    const args = {
      block_header: this.web3.utils.hexToBytes(block.header_rlp),
      dag_nodes: h512s
        .filter((_, index) => index % 2 === 0)
        .map((element, index) => {
          return {
            dag_nodes: [element, h512s[index * 2 + 1]],
            proof: block.merkle_proofs
              .slice(
                index * block.proof_length,
                (index + 1) * block.proof_length
              )
              .map((leaf) => this.web3.utils.padLeft(leaf, 32)),
          }
        }),
    }

    // console.log('block header '+ args.block_header)
    // console.log('dag nodes length '+ args.dag_nodes[1].dag_nodes.length)
    
    // console.log('dag nodes proof  length'+ args.dag_nodes[1].proof.length)
    
    // args with block header Rlp  and dag elements and proofs
    // console.log(args)
    
    //submit data from web3 block for now
    const web3Block = await this.robustWeb3.getBlock(blockNumber)
    console.log(`Submitting block ${blockNumber} blockhash ${web3Block.hash} to EthClient`)
    console.log(web3Block)
    const methods = await this.ethClientContract.parameterSchema.ExtractSignatures()
    // console.log(methods)
    // const dfd = await this.ethClientContract.methods.increment(4).send()
    // console.log(dfd)
    const txHash= await this.ethClientContract.methods.add_block_header(web3Block.hash,web3Block.number,web3Block.parentHash).send()
    console.log(txHash)
    
     txHash= await this.ethClientContract.block_hash_safe(1).send()
     console.log(txHash)
    
    return txHash
  }
}

exports.Eth2NearRelay = Eth2NearRelay
exports.execute = execute
