pragma solidity ^0.6;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../../tezosbridge/contracts/ITezosBridge.sol";
import "../../tezosbridge/contracts/TezosDecoder.sol";
import "./ProofDecoder.sol";
import "./ITezosProver.sol";


contract TezosProver is ITezosProver {
    using SafeMath for uint256;
    using Borsh for Borsh.Data;
    using TezosDecoder for Borsh.Data;
    using ProofDecoder for Borsh.Data;

    ITezosBridge public bridge;

    constructor(ITezosBridge _bridge) public {
        bridge = _bridge;
    }

    function proveOutcome(bytes memory proofData, uint64 blockHeight) override public view returns(bool) {
        Borsh.Data memory borshData = Borsh.from(proofData);
        ProofDecoder.FullOutcomeProof memory fullOutcomeProof = borshData.decodeFullOutcomeProof();
        require(borshData.finished(), "TezosProver: argument should be exact borsh serialization");

        bytes32 hash = _computeRoot(
            fullOutcomeProof.outcome_proof.outcome_with_id.hash,
            fullOutcomeProof.outcome_proof.proof
        );

        hash = sha256(abi.encodePacked(hash));

        hash = _computeRoot(
            hash,
            fullOutcomeProof.outcome_root_proof
        );

        require(
            hash == fullOutcomeProof.block_header_lite.inner_lite.outcome_root,
            "TezosProver: outcome merkle proof is not valid"
        );

        bytes32 expectedBlockMerkleRoot = bridge.blockMerkleRoots(blockHeight);

        require(
            _computeRoot(fullOutcomeProof.block_header_lite.hash, fullOutcomeProof.block_proof) == expectedBlockMerkleRoot, "TezosProver: block proof is not valid"
        );

        return true;
    }

    function _computeRoot(bytes32 node, ProofDecoder.MerklePath memory proof) internal pure returns(bytes32 hash) {
        hash = node;
        for (uint i = 0; i < proof.items.length; i++) {
            ProofDecoder.MerklePathItem memory item = proof.items[i];
            if (item.direction == 0) {
                hash = sha256(abi.encodePacked(item.hash, hash));
            }
            else {
                hash = sha256(abi.encodePacked(hash, item.hash));
            }
        }
    }
}
