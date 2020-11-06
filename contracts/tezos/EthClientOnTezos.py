# Counter - Example for illustrative purposes only.

import smartpy as sp

class EthClientOnTezos(sp.Contract):
    def __init__(self):
        self.init(storedValue = 0,
                  latest_block =0,
                  previous_hash = sp.bytes('0x'),
                  header_hash = sp.bytes('0x'),
                  canonical_header_hashes = sp.map(tkey= sp.TNat , tvalue=sp.TBytes),
                  known_hashes = sp.set(t=sp.TBytes)
                  
                  )
                  
        # alert("I'm here" + self.storage.number)    
        
    @sp.entry_point
    def add_block_header(self, params):
        
        parent_hash = params.block_header.parent_hash
        header_hash = params.block_header.hash
        
        #  parent hash is not verified for the first block that is being added to eth client 
        sp.if self.data.latest_block > 0:
            sp.verify(parent_hash==self.data.previous_hash, message ="Invalid Block: Invalid parent hash" )
        
        self.data.latest_block = params.block_header.number
        self.data.canonical_header_hashes[params.block_header.number] = header_hash
        self.data.known_hashes.add(header_hash)
    
    
    
    #  Returns the block hash from the canonical chain.
    @sp.entry_point
    def block_hash(self, params):
        self
    
    
    @sp.entry_point
    def block_hash_safe(self, params):
        
        parent_hash = params.block_header.parent_hash
        header_hash = params.block_header.hash
        
        #  parent hash is not verified for the first block that is being added to eth client 
        sp.if self.data.latest_block > 0:
            sp.verify(parent_hash==self.data.previous_hash, message ="Invalid Block: Invalid parent hash" )
        
        self.data.latest_block = params.block_header.number
        self.data.known_hashes.add(header_hash)
    
        
    
@sp.add_test(name="EthClientOnTezos")
def test():
    scenario = sp.test_scenario()
    scenario.h1("Store Value")
    contract = EthClientOnTezos()
    scenario += contract
    # alert("Hello World")






7