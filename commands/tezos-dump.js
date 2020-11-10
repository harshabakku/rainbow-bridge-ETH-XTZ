const fs = require('fs').promises
const Path = require('path')
const { RainbowConfig } = require('rainbow-bridge-lib/config')
const fetch = require('node-fetch')

async function getLatestBlock(tezosNodeUrl) {
  const resp = await fetch(tezosNodeUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'block',
      params: {
        finality: 'final',
      },
    }),
  })
  const data = await resp.json()
  return data.result
}

async function getBlockChunk(tezosNodeUrl, block) {
  let resp = await fetch(tezosNodeUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'chunk',
      params: [block.chunks[0].chunk_hash],
    }),
  })
  let data = await resp.json()
  return data.result
}

async function getTxProof(tezosNodeUrl, futureBlock, txn) {
  let resp = await fetch(tezosNodeUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'light_client_proof',
      params: {
        type: 'transaction',
        transaction_hash: txn.hash,
        receiver_id: txn.receiver_id,
        sender_id: txn.signer_id,
        light_client_head: futureBlock.header.hash,
      },
    }),
  })
  let data = await resp.json()
  return data.result
}

async function getReceiptProof(tezosNodeUrl, futureBlock, receipt) {
  let resp = await fetch(tezosNodeUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'light_client_proof',
      params: {
        type: 'receipt',
        receipt_id: receipt.receipt_id,
        receiver_id: receipt.receiver_id,
        light_client_head: futureBlock.header.hash,
      },
    }),
  })
  let data = await resp.json()
  return data.result
}

async function getNextLightClientBlock(tezosNodeUrl, blockHash) {
  const resp = await fetch(tezosNodeUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'dontcare',
      method: 'next_light_client_block',
      params: [blockHash],
    }),
  })
  const data = await resp.json()
  return data.result
}

class TezosDump {
  static async execute(kindOfData, { path, numBlocks }) {
    if (kindOfData !== 'headers' && kindOfData !== 'proofs') {
      console.log(
        'Usage: node index.js tezos-dump headers\n       node index.js tezos-dump proofs'
      )
      process.exit(2)
    }

    if (!numBlocks) {
      numBlocks = 100
    }
    const tezosNodeUrl = RainbowConfig.getParam('tezos-node-url')

    let latestBlock = await getLatestBlock(tezosNodeUrl)

    if (kindOfData == 'headers') {
      await TezosDump.dumpHeaders(tezosNodeUrl, path, latestBlock, numBlocks)
    } else if (kindOfData == 'proofs') {
      await TezosDump.dumpProofs(tezosNodeUrl, path, latestBlock, numBlocks)
    }
  }

  static async dumpHeaders(tezosNodeUrl, path, latestBlock, numBlocks) {
    console.log(
      `Downloading ${numBlocks} light client blocks start from ${latestBlock.header.height}`
    )

    let newLatestBlock
    while (numBlocks > 0) {
      newLatestBlock = await getLatestBlock(tezosNodeUrl)
      if (newLatestBlock.header.height > latestBlock.header.height) {
        console.log(`Got new block at height ${newLatestBlock.header.height}`)
        let block
        do {
          block = await getNextLightClientBlock(
            tezosNodeUrl,
            newLatestBlock.header.hash
          )
        } while (!block)
        console.log(
          `Got new light client block at height ${block.inner_lite.height}`
        )
        await TezosDump.saveBlock(block.inner_lite.height, block, path)
        latestBlock = newLatestBlock
        numBlocks--
      } else {
        continue
      }
    }
  }

  static async dumpProofs(tezosNodeUrl, path, latestBlock, numBlocks) {
    console.log(
      `Downloading ${numBlocks} light client proofs start from ${latestBlock.header.height}`
    )

    let newLatestBlock
    while (numBlocks > 0) {
      newLatestBlock = await getLatestBlock(tezosNodeUrl)
      if (newLatestBlock.header.height > latestBlock.header.height) {
        console.log(`Got new block at height ${newLatestBlock.header.height}`)
        let chunk = await getBlockChunk(tezosNodeUrl, latestBlock)
        console.log(
          `There are ${chunk.transactions.length} txns in block ${latestBlock.header.height}'s chunk`
        )
        console.log(
          `There are ${chunk.receipts.length} receipts in block  ${latestBlock.header.height}'s chunk`
        )
        for (let i in chunk.transactions) {
          //let proof = await getTxProof(tezosNodeUrl, newLatestBlock, chunk.transactions[i]);
          //await TezosDump.saveProof(latestBlock.header.height, 'txn', i, proof, path)
        }
        for (let i in chunk.receipts) {
          let proof = await getReceiptProof(
            tezosNodeUrl,
            newLatestBlock,
            chunk.receipts[i]
          )
          await TezosDump.saveProof(
            latestBlock.header.height,
            'receipt',
            i,
            proof,
            path
          )
        }
        latestBlock = newLatestBlock
        numBlocks--
      } else {
        continue
      }
    }
  }

  static async saveBlock(i, block, path) {
    const file = Path.join(path, `${i}.json`)
    await fs.writeFile(file, JSON.stringify(block))
  }

  static async saveProof(block_i, type, i, proof, path) {
    const file = Path.join(path, `${block_i}_${type}_${i}.json`)
    await fs.writeFile(file, JSON.stringify(proof))
    console.log('Saved ' + file)
  }
}

exports.TezosDump = TezosDump
