// File: contracts/ITezosProver.sol

pragma solidity ^0.6;

interface ITezosProver {
    function proveOutcome(bytes calldata proofData, uint64 blockHeight) external view returns(bool);
}
