# Counter - Example for illustrative purposes only.

import smartpy as sp

class EthClientOnTezos(sp.Contract):
    def __init__(self, initialValue = 5):
        self.init(storedValue = initialValue,
                  number =0,
                  parent_hash = sp.bytes('0x'),
                  header_hash = sp.bytes('0x'),
                  
                  )
        # alert("I'm here" + self.storage.number)    
        
    @sp.entry_point
    def add_block_header(self, params):
        self.data.parent_hash = params.block_header.parent_hash
        self.data.number = params.block_header.number
        self.data.header_hash = params.block_header.hash
    
@sp.add_test(name="EthClientOnTezos")
def test():
    scenario = sp.test_scenario()
    scenario.h1("Store Value")
    contract = EthClientOnTezos()
    scenario += contract
    # alert("Hello World")






7