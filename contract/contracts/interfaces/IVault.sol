// contracts/interfaces/IVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVault {
    function provideCashback(address to, uint256 amount) external;
}
