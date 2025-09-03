// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IVault.sol";

contract MockVault is IVault {
    event Cashback(address indexed to, uint256 amount);
    function provideCashback(address to, uint256 amount) external override {
        emit Cashback(to, amount);
    }
}
