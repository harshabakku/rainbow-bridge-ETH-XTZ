# Counter - Example for illustrative purposes only.

import smartpy as sp

# Request parameters
hash_set_type = sp.TSet(sp.TString)

class EthClientOnTezos(sp.Contract):
    def __init__(self):
        self.init(storedValue = 0,
                  latest_block =0,
                  sample_hash = sp.string('0x'),
                  

                #   Hash of the header that has the highest cumulative difficulty. The current head of the canonical chain
                  header_hash = sp.string('0x'),

                #   Hashes of the canonical chain mapped to their numbers. Stores up to `hashes_gc_threshold` entries header number -> header hash  
                  canonical_header_hashes = sp.map(tkey= sp.TNat , tvalue=sp.TString),

                 # All known header hashes for a block number. Stores up to `finalized_gc_threshold`.
                 # header number -> hashes of all headers with this number.
                 # used in the relayer to backtrack if chain switched the fork.
                  known_hashes = sp.big_map(tkey = sp.TNat, tvalue= hash_set_type),

                 #  Number of confirmations that applications can use to consider the transaction safe.For most use cases 25 should be enough, for super safe cases it should be 500.  
                  num_confirmations=2
                  
                  )
                  
        # alert("testing log" + self.storage.number)    
       
       
       
    #   Add the block header to the client.
    #  `block_header` -- RLP-encoded Ethereum header;
    #  `dag_nodes` -- dag nodes with their merkle proofs.    
    @sp.entry_point
    def add_block_header(self, params ):
        
        parent_hash = params.block.parent_hash
        header_number = params.block.header_number
        
        #current header_hash recieved from eth client
        header_hash = params.block.header_hash
        
        # latest header hash stored in the eth client 
        prev_hash = self.data.header_hash
        
        
        #  to manage hard forks use all_known_hashes so we can get header_hash of any header_number so we can verify parent_hash in case if canonical chain changes 
        
        #  parent hash is not verified for the first block that is being added to eth client 
        sp.if self.data.latest_block > 0:
            sp.verify(parent_hash==prev_hash, message ="Invalid Block: Invalid parent hash" )
        
        # self.verify_header()           
        self.data.latest_block = header_number
        self.data.canonical_header_hashes[header_number] = header_hash
        self.data.header_hash = header_hash
        
        sp.if self.data.known_hashes.contains(header_number):
            self
            self.data.known_hashes[header_number].add(header_hash)
        sp.else :
            # self
            self.data.known_hashes[header_number] = sp.set()
            self.data.known_hashes[header_number].add(header_hash)
    
    
  
    
    # Verify PoW of the header, difficulty,
    # dag entries (used to compute mixedHash in the block ) and their merkle proofs(hashes of leaves) to arrive at merkle root of 4GB DAG file used every epoch: 30000 blocks 
    # See Ethereum YellowPaper formula (50) in section 4.3.4
    def verify_header(self, params):
        header = params.header
        params.prev_header
        dag_nodes = params.dag_nodes
        
        dag_nodes.dag_nodes
        dag_nodes.proofs
        header.nonce
        header.partial_hash
    
    #  Returns the block hash from the canonical chain.
    def block_hash(self, params):
        return self.data.canonical_header_hashes[params.index]
    
    
    #  Returns block header hash of index if valid
    #  validates the number of confirmations.

    def block_hash_safe(self, params):
        header_hash = self.block_hash(params.index)
        
        sp.if params.index + self.data.num_confirmations > self.data.latest_block :
            return sp.none
        sp.else :
            return header_hash
    
        
    # Returns all hashes known for that height.
    def known_hashes(self, params):
        return self.data.known_hashes[params.index]
        
    @sp.entry_point
    def increment(self, params):
        
        self.data.sample_hash = params.block.hash
 
   
        
    
        
@sp.add_test(name = "Minimal")
def test():
    scenario = sp.test_scenario()
    scenario.h1("Minimal")
    c1 = EthClientOnTezos()
    scenario += c1
    scenario += c1.increment(sp.record(block = sp.record(hash = sp.string('sdhkf')) ))
    
    scenario += c1
    scenario += c1.add_block_header(sp.record(block = sp.record(parent_hash = sp.string('sdfsdf'), header_hash = sp.string('dfsdf'),header_number = 8)))
    



